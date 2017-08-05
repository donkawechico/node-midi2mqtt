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

function AiLight(zone, name) {

	this.name = name;
	this.zone = zone;

	this.mqtt_base_topic = util.format('home/%s/light/%s', this.zone, this.name);
	this.mqtt_set_topic = util.format('%s/set', this.mqtt_base_topic);

	this.turn_on = function() {
		console.log("turning on " + this.name);
		currentlyOn.add(this);
		mqtt_client.publish(this.mqtt_set_topic, "{'state':'ON'}");
	}
	this.turn_off = function() {
		console.log("turning off " + this.name);
		currentlyOn.delete(this);
		mqtt_client.publish(this.mqtt_set_topic, "{'state':'OFF'}");
	}
	this.setBrightness = function(brightness) {
		mqtt_client.publish(this.mqtt_set_topic, "{'brightness':'" + brightness + "'}");
		console.log("setting brightness of " + this.name + " to " + brightness);
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
		console.log(note);
		switch (note) {
			case "C": return this.Orb;
			case "D": return this.KitchenGasCanMain;
			case "E": return this.KitchenGasCanNozzle;
			case "F": return this.LivingRoomSculpture;
			case "G": return this.LivingRoomGasCan;
			case "A": return this.ShopGasCan;
			case "B": return this.EntryUmbrella;
		}
	}

	this.setBrightnessForOnLights = function(brightness) {
		currentlyOn.forEach(function(light) {
			light.setBrightness(brightness);
		});
	}

	this.disconnect = function() {
		mqtt_client.publish("midi2mqtt","Disconnecting");
		console.log("Disconnecting...");
		mqtt_client.end();
	}
}



module.exports = AiLights;