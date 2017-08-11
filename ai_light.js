var mqtt = require('mqtt');
const util = require('util');
var url = require('url');

var mqtt_uri = util.format('%s://%s:%s@%s:%s', 
                process.env.MQTT_PROTOCOL,
                process.env.MQTT_USERNAME,
                process.env.MQTT_PASSWORD,
                process.env.MQTT_HOST,
                process.env.MQTT_PORT);

var mqtt_uri = url.parse(mqtt_uri);
console.log("About to connect");
mqtt_client  = mqtt.connect(mqtt_uri);
mqtt_client.publish("midi2mqtt","Connected");

currentlyOn = new Set();
allLights = new Set();
pendingOffLights = new Set();

pedalDown = false;

function AiLight(zone, name) {
	this.name = name;
	this.zone = zone;

	allLights.add(this);

	this.mqtt_base_topic = util.format('home/%s/light/%s', this.zone, this.name);
	this.mqtt_set_topic = util.format('%s/set', this.mqtt_base_topic);

	var currentState = new OffLight(this);

	this.setState = function(state) {
		currentState = state;
		currentState.go();
	}

	this.turn_on = function(brightness) {
		this.setState(new OnLight(this, brightness));
	}

	this.turn_off = function() {
		this.setState(new RequestingOffLight(this));
	}

	this.setBrightness = function(brightness) {
		currentState.setBrightness(brightness);
	}

	this.setColorTemperature = function(temp) {
		currentState.setColorTemperature(temp);
	}
}

function RequestingOffLight(light) {
	this.light = light;

	this.go = function() {
		if (!pedalDown) light.setState(new OffLight(light));
		else pendingOffLights.add(light);
	}
}

function AwaitingOffLight(light) {
	this.light = light;

	this.turn_on = function(brightness) {
		console.log("turning on " + light.name);
		mqtt_client.publish(light.mqtt_set_topic, "{'state':'ON','brightness':" + brightness + "}");
		currentlyOn.add(light);
	}
	this.turn_off = function() {
		console.log("Not turning off because light is now a 'Hold' light");
	}
	this.setBrightness = function(brightness) {
		mqtt_client.publish(light.mqtt_set_topic, "{'brightness':'" + brightness + "'}");
		console.log("setting brightness of " + light.name + " to " + brightness);
	}
	this.setColorTemperature = function(temp) {
		mqtt_client.publish(light.mqtt_set_topic, "{'color_temp':'" + temp + "'}");
		console.log("setting color temperature of " + light.name + " to " + temp);
	}
}

function OnLight(light, brightness) {
	this.light = light;
	this.brightness = brightness;

	this.go = function() {
		console.log("turning on " + light.name);
		if (pendingOffLights.has(light)) pendingOffLights.delete(light);
		mqtt_client.publish(light.mqtt_set_topic, "{'state':'ON','brightness':" + brightness + "}");
		currentlyOn.add(light);
	}
	
	this.setBrightness = function(brightness) {
		mqtt_client.publish(light.mqtt_set_topic, "{'brightness':'" + brightness + "'}");
		console.log("setting brightness of " + light.name + " to " + brightness);
	}
	this.setColorTemperature = function(temp) {
		mqtt_client.publish(light.mqtt_set_topic, "{'color_temp':'" + temp + "'}");
		console.log("setting color temperature of " + light.name + " to " + temp);
	}
}

function OffLight(light) {
	this.light = light;

	this.go = function() {
		console.log("turning off " + light.name);
		mqtt_client.publish(light.mqtt_set_topic, "{'state':'OFF'}");
		currentlyOn.delete(light);
	}
}

function AiLights() {
	this.Orb = new AiLight("livingroom","orb");
	this.KitchenGasCanNozzle = new AiLight("kitchen","gascan/nozzle");
	this.KitchenGasCanMain = new AiLight("kitchen","gascan/main");
	this.LivingRoomGasCan = new AiLight("livingroom","gascan");
	this.LivingRoomSculpture = new AiLight("livingroom","sculpture");
	this.ShopGasCan = new AiLight("shop","gascan");
	this.EntryUmbrella = new AiLight("entry","umbrella");

	this.lightForNote = function(note) {
		console.log("lightfornote: " + note);
		switch (note) {
			case "C":
			case "C#": return this.Orb;
			case "D": 
			case "D#": return this.KitchenGasCanMain;
			case "E": return this.KitchenGasCanNozzle;
			case "F": 
			case "F#": return this.LivingRoomSculpture;
			case "G": 
			case "G#": return this.LivingRoomGasCan;
			case "A": 
			case "A#": return this.ShopGasCan;
			case "B": return this.EntryUmbrella;
		}
	}

	this.setPedalState = function(pedalState) {
		pedalDown = pedalState;
	}
	this.setTempForOnLights = function(temp) {
		currentlyOn.forEach(function(light) {
			light.setColorTemperature(temp);
		});
	}
	this.setBrightnessForOnLights = function(brightness) {
		currentlyOn.forEach(function(light) {
			light.setBrightness(brightness);
		});
	}

	this.turnOffAllPendingOffLights = function() {
		pendingOffLights.forEach(function(light) {
			light.turn_off();
		});
		pendingOffLights = new Set();
	}

	this.setAllLightsToHoldLights = function() {
		allLights.forEach(function(light) {
			light.setState(new HoldLight(light));
		});
	}

	this.setAllLightsToNormalLights = function() {
		allLights.forEach(function(light) {
			light.setState(new NormalLight(light));
		});
	}

	this.disconnect = function() {
		mqtt_client.publish("midi2mqtt","Disconnecting");
		console.log("Disconnecting...");
		mqtt_client.end();
	}
}



module.exports = AiLights;