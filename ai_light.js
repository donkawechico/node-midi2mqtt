'use strict';

const mqtt = require('mqtt');
const util = require('util');
const url  = require('url');

const mqttUri = url.parse(util.format('%s://%s:%s@%s:%s',
    process.env.MQTT_PROTOCOL,
    process.env.MQTT_USERNAME,
    process.env.MQTT_PASSWORD,
    process.env.MQTT_HOST,
    process.env.MQTT_PORT));

const mqttClient = mqtt.connect(mqttUri);

let mqttConnected = false;

mqttClient.on('connect', () => {
    mqttConnected = true;
    mqttClient.publish('midi2mqtt', 'Connected');
    console.log('MQTT connected');
});

mqttClient.on('error', err => {
    mqttConnected = false;
    console.error('MQTT error:', err.message);
});

mqttClient.on('close', () => { mqttConnected = false; });

// ── Shared light state ────────────────────────────────────────────────────
const currentlyOn      = new Set();
const allLights        = new Set();
const pendingOffLights = new Set();
let pedalDown = false;

function publish(topic, payload) {
    mqttClient.publish(topic, JSON.stringify(payload));
}

// ── Light state machine ───────────────────────────────────────────────────
function OnState(light, brightness) {
    this.go = function () {
        pendingOffLights.delete(light);
        publish(light.mqttSetTopic, { state: 'ON', brightness });
        currentlyOn.add(light);
        console.log('on:', light.name, 'brightness:', brightness);
    };
    this.setBrightness = function (b) {
        publish(light.mqttSetTopic, { brightness: b });
    };
    this.setColorTemperature = function (temp) {
        publish(light.mqttSetTopic, { color_temp: temp });
    };
}

function OffState(light) {
    this.go = function () {
        publish(light.mqttSetTopic, { state: 'OFF' });
        currentlyOn.delete(light);
        console.log('off:', light.name);
    };
}

function RequestingOffState(light) {
    this.go = function () {
        if (!pedalDown) {
            light.setState(new OffState(light));
        } else {
            pendingOffLights.add(light);
        }
    };
}

// ── AiLight ───────────────────────────────────────────────────────────────
function AiLight(zone, name) {
    this.name = name;
    this.zone = zone;
    this.mqttSetTopic = util.format('home/%s/light/%s/set', zone, name);

    allLights.add(this);

    let currentState = new OffState(this);

    this.setState = function (state) {
        currentState = state;
        currentState.go();
    };

    this.turn_on = function (brightness) {
        this.setState(new OnState(this, brightness));
    };

    this.turn_off = function () {
        this.setState(new RequestingOffState(this));
    };

    this.setBrightness = function (b) {
        if (currentState.setBrightness) currentState.setBrightness(b);
    };

    this.setColorTemperature = function (temp) {
        if (currentState.setColorTemperature) currentState.setColorTemperature(temp);
    };
}

// ── AiLights (collection) ─────────────────────────────────────────────────
function AiLights() {
    this.Orb               = new AiLight('livingroom', 'orb');
    this.KitchenGasCanMain   = new AiLight('kitchen',    'gascan/main');
    this.KitchenGasCanNozzle = new AiLight('kitchen',    'gascan/nozzle');
    this.LivingRoomSculpture = new AiLight('livingroom', 'sculpture');
    this.LivingRoomGasCan    = new AiLight('livingroom', 'gascan');
    this.ShopGasCan          = new AiLight('shop',       'gascan');
    this.EntryUmbrella       = new AiLight('entry',      'umbrella');

    this.lightForNote = function (note) {
        switch (note) {
            case 'C':  case 'C#': return this.Orb;
            case 'D':  case 'D#': return this.KitchenGasCanMain;
            case 'E':             return this.KitchenGasCanNozzle;
            case 'F':  case 'F#': return this.LivingRoomSculpture;
            case 'G':  case 'G#': return this.LivingRoomGasCan;
            case 'A':  case 'A#': return this.ShopGasCan;
            case 'B':             return this.EntryUmbrella;
            default:              return null;
        }
    };

    this.setPedalState = function (down) { pedalDown = down; };

    this.turnOffAllPendingOffLights = function () {
        pendingOffLights.forEach(l => l.turn_off());
        pendingOffLights.clear();
    };

    this.setBrightnessForOnLights = function (brightness) {
        currentlyOn.forEach(l => l.setBrightness(brightness));
    };

    this.setTempForOnLights = function (temp) {
        currentlyOn.forEach(l => l.setColorTemperature(temp));
    };

    this.isConnected = function () { return mqttConnected; };

    this.disconnect = function () {
        mqttClient.publish('midi2mqtt', 'Disconnecting');
        mqttClient.end();
    };
}

module.exports = AiLights;
