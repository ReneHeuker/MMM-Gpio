"use strict";

Module.register("MMM-Gpio", {

 	defaults: {
		debug: true,
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
				samplingInterval: 1000,
				events: {
					onPressed: "GPIO_RIGHT_SENSOR_ACTIVATED",
					onReleased: "GPIO_RIGHT_SENSOR_RELEASED",
					onBoth: "GPIO_BOTH_SENSORS_ACTIVATED"
				}
			},
			{
				path: "/sample/left",
				name: "Left sensor",
				triggerPin: 23,
				echoPin: 24,
				treshold: 20,
				samplingInterval: 1000,
				events: {
					onPressed: "GPIO_LEFT_SENSOR_ACTIVATED",
					onReleased: "GPIO_LEFT_SENSOR_RELEASED",
					onBoth: "GPIO_BOTH_SENSORS_ACTIVATED"
				}
			}
		]
 	},

	deepMergeConfig: function(defaults, config) {
		const mergedConfig = {...defaults, ...config};
        mergedConfig.service = {...defaults.service, ...config.service};
        mergedConfig.service.remote = {...defaults.service.remote, ...config.service.remote};
        mergedConfig.service.gpio = {...defaults.service.gpio, ...config.service.gpio};
        mergedConfig.sensors[0] =  {...defaults.sensors[0], ...config.sensors[0]};
        mergedConfig.sensors[0].events =  {...defaults.sensors[0].events, ...config.sensors[0].events};
        mergedConfig.sensors[1] =  {...defaults.sensors[1], ...config.sensors[1]};
        mergedConfig.sensors[1].events =  {...defaults.sensors[1].events, ...config.sensors[1].events};

        return mergedConfig;
	},

	start: function () {
	 	Log.info("Starting module: " + this.name);
	},

	notificationReceived: function (notification, payload) {
		// var self = this;
		if (notification === "ALL_MODULES_STARTED") {

            var mergedConfig = this.deepMergeConfig(this.defaults, this.config);
			this.sendSocketNotification("GPIO_CONFIG", mergedConfig);

			let payload = {
				module: this.name,
				path: "gpio",
				actions: [
					{notification: "GPIO_RIGHT_SENSOR_ACTIVATED", prettyName: "Rechter sensor geactiveerd"},
					{notification: "GPIO_LEFT_SENSOR_ACTIVATED", prettyName: "Linker sensor geactiveerd"},
					{notification: "GPIO_BOTH_SENSORS_ACTIVATED", prettyName: "Beide sensoren geactiveerd"}
				]
			};
			this.sendNotification("REGISTER_API", payload);

		} else {
			if (notification.startsWith('GPIO')) {
				this.sendSocketNotification(notification, payload);
			} else {
				this.sendNotification(notification, payload);
			}
		}
	},

	socketNotificationReceived: function (notification, payload) {
		this.sendNotification(notification, payload);
	},

});
