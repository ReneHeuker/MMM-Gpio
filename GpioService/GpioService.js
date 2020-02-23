"use strict";

var express = require("express");
var service = express();

const Gpio = require("onoff").Gpio;
const http = require("http");

let RIGHT = 0;
let LEFT = 1;

let INACTIVE = 0;
let ACTIVE = 1;

let config = {
	debug:true,
	service: {
		remote: {
			host: '0.0.0.0',
			path: '/api/notification/',
			port: 8080
		},
		gpio: {
			path: '/gpio/',
			port: 3000
		}
	},
	sensors: [
		{
			path: "/sample/right",
			name: "Right sensor",
			triggerPin: 25,
			echoPin: 26,
			treshold: 20,
			samplingInterval: 500,
			events: {
				onPressed: "",
				onReleased: "",
				onBoth: ""
			}
		},
		{
			path: "/sample/left",
			name: "Left sensor",
			triggerPin: 23,
			echoPin: 24,
			treshold: 20,
			samplingInterval: 500,
			events: {
				onPressed: "",
				onReleased: "",
				onBoth: ""
			}
		}
	]
};

var sensors = [{}, {}];

function debugMessage(message) {
	if (config.debug) {
		process.stdout.write(message);
	}
}

function postAction(idx, notification) {

	if (notification && notification !== "") {
		const data = JSON.stringify({
			name: config.sensors[idx].name
		});

		const options = {
			hostname: config.service.remote.host,
			port: config.service.remote.port,
			path: config.service.remote.path + notification,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": data.length
			}
		};

		debugMessage('posting notification: ' + options.path);

		const req = http.request(options, (res) => {
			debugMessage(`Http POST statusCode: ${res.statusCode}`);
			res.setEncoding("utf8");
			res.on("data", (d) => {
				debugMessage(d);
			});
		});

		req.on("error", (error) => {
			process.stdout.write('Http POST error: ' + error);
		});

		req.write(data);
		req.end();

	}
}

function getMicroSeconds() {
	var time = process.hrtime();
	return Math.trunc(time[0] * 1000000 + time[1] / 1000);
}

function initSensor(idx) {
	sensors[idx].trigger = new Gpio(config.sensors[idx].triggerPin, "out");
	sensors[idx].trigger.writeSync(0);
	sensors[idx].echo = new Gpio(config.sensors[idx].echoPin, "in", "rising");

	sensors[idx].state = INACTIVE;
	sensors[idx].sample = {
		sampling: false,
		start: 0,
		end: 0,
		value: 0
	};

	sensors[idx].echo.watch((error, value) => {
		if (!error) {
			if (sensors[idx].sample.sampling === false) {
				sensors[idx].sample.sampling = true;
				sensors[idx].sample.start = getMicroSeconds();
				while (sensors[idx].echo.readSync() === 1) {
				}
				sensors[idx].sample.end = getMicroSeconds();
				sensors[idx].sample.value = Math.trunc((sensors[idx].sample.end - sensors[idx].sample.start) / 58);
				sensors[idx].sample.sampling = false;
			}
		}
	});

	sensors[idx].interval = setInterval(
		function () {
			if (sensors[idx].sample.sampling === false) {

				sensors[idx].trigger.writeSync(1);
				setTimeout(function () {
					sensors[idx].trigger.writeSync(0);
				}, 1);

				if ((sensors[idx].sample.value > 0) && (sensors[idx].sample.value < config.sensors[idx].treshold)) {
					if (sensors[idx].state !== ACTIVE) {
						sensors[idx].state = ACTIVE;
						if (sensors[RIGHT].state === ACTIVE && sensors[LEFT].state === ACTIVE) {
							debugMessage('both sensors pressed');
							postAction(idx, config.sensors[idx].events.onBoth);
						} else {
							debugMessage(config.sensors[idx].name + " pressed");
							postAction(idx, config.sensors[idx].events.onPressed);
						}
					}
				} else {
					if (sensors[idx].state !== INACTIVE) {
						sensors[idx].state = INACTIVE;
						debugMessage(config.sensors[idx].name + " released");
						postAction(idx, config.sensors[idx].events.onReleased);
					}
				}
			}
		},
		config.sensors[idx].samplingInterval
	);
}

function exitSensor(idx) {
	clearInterval(sensors[idx].interval);
	sensors[idx].trigger.unexport();
	sensors[idx].echo.unexport();
}

function onStart(args) {

	if (args && args.length > 0) {
		const mergedConfig = {...config, ...JSON.parse(args[0]) };
		config = {...mergedConfig};
		debugMessage('start with overridden config : \n' + JSON.stringify(mergedConfig, null, 2));
	} else {
		debugMessage('started with default config : \n' + JSON.stringify(config, null, 2));
	}
	if (Gpio.accessible) {
		initSensor(RIGHT);
		initSensor(LEFT);
	} else {
		process.stdout.write("Gpio is not accessible, try starting it with sudo");
		process.exit(1);
	}

}

function onExit(options, exitCode) {
	if (options.cleanup) {
		exitSensor(RIGHT);
		exitSensor(LEFT);
	}
	if (exitCode || exitCode === 0) {
	 	debugMessage('service stopped with exitcode: '+ exitCode);
	}
	if (options.exit) {
		process.exit();
	}
}

onStart(process.argv.slice(2));

//do something when app is closing
process.on("exit", onExit.bind(null, {cleanup: true}));
//catches ctrl+c event
process.on("SIGINT", onExit.bind(null, {exit: true}));
// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", onExit.bind(null, {exit: true}));
process.on("SIGUSR2", onExit.bind(null, {exit: true}));
//catches uncaught exceptions
process.on("uncaughtException", onExit.bind(null, {exit: true}));

service.listen(config.service.gpio.port, () => {
    debugMessage('weservice start listening on port ' + config.service.gpio.port);
});

service.get(config.sensors[RIGHT].path, (request, response, next) => {
	response.json({
		name: config.sensors[RIGHT].name,
		value: sensors[RIGHT].sample.value
	});
});

service.get(config.sensors[LEFT].path, (request, response, next) => {
	response.json({
		name: config.sensors[LEFT].name,
		value: sensors[LEFT].sample.value
	});
});
