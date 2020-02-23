"use strict";

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

	start: function () {
		this.started = false;
	},

	socketNotificationReceived: function (notification, payload) {

		const self = this;
		if (notification === "GPIO_CONFIG" && self.started === false) {

			console.log('setup GpioService');

			// creating demon spawn
			var child = require("child_process").spawn("sudo", [
				"node", __dirname + "/GpioService/GpioService.js", JSON.stringify(payload),
			]);

			child.stdout.on("data", (data) => {
				console.log("GpioService: " + data.toString());
			});

			child.stdout.on("exit", function (exitCode) {
				console.log("GpioService: exited with exitcode " + exitCode);
			});

			self.started = true;

		}
		else if (notification === "GPIO_RIGHT_SENSOR_ACTIVATED") {
			self.sendSocketNotification("PAGE_INCREMENT", null);
		} else if (notification === "GPIO_LEFT_SENSOR_ACTIVATED") {
			self.sendSocketNotification("PAGE_DECREMENT", null);
		} else if (notification === "GPIO_BOTH_SENSORS_ACTIVATED") {
			self.sendSocketNotification("SHOW_ALERT",{
			    title: "GPio",
				message: "beide sensorn tegelijk!",
				timer: 3000
		    });
		}
	}

});
