require('dotenv').config()
const util = require('util');
const express = require('express')
const app = express()
const path = require('path')
const RATE_LIMIT = 10
var bodyParser = require('body-parser');
var url = require('url');
var $ = require('jQuery');
var mqtt = require('mqtt');

mqtt_uri = util.format('%s://%s:%s@%s:%s', 
                process.env.MQTT_PROTOCOL,
                process.env.MQTT_USERNAME,
                process.env.MQTT_PASSWORD,
                process.env.MQTT_HOST,
                process.env.MQTT_PORT);

var mqtt_uri = url.parse(mqtt_uri);
var mqtt_client  = mqtt.connect(mqtt_uri);
var api_call_count = 0;


app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json())
app.use(express.static("node_modules/webmidi"));
app.use(express.static("javascript"));

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.post('/mqtt/pitchbend', function(req, res) {
    var raw_value = parseFloat(req.body.bend_value);
    var bend_value = (raw_value + 1)/2;

    var brightness = Math.round(bend_value * 255);

    orb_topic = "home/livingroom/light/orb/set";
    orb_message = '{"brightness":' + brightness + ',"transition":0,"gamma":true}';

    if (api_call_count++%5==0 || raw_value == 0.0 || Math.abs(raw_value) > 0.95) { 
        console.log(brightness);
        mqtt_client.publish(orb_topic, orb_message);
        api_call_count = 1;
    }

    res.send('Pitch value found: "' + brightness + '".');
});

app.post('/mqtt/noteon', function(req, res) {
    orb_topic = "home/livingroom/light/orb/set";
    orb_message = '{"state":"ON"}';

    mqtt_client.publish(orb_topic, orb_message);

    res.send('Turning light ON');
});

app.post('/mqtt/noteoff', function(req, res) {
    orb_topic = "home/livingroom/light/orb/set";
    orb_message = '{"state":"OFF"}';

    mqtt_client.publish(orb_topic, orb_message);

    res.send('Turning light OFF');
});

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('clean');
        mqtt_client.end();
    }
    if (err) {
        console.log(err.stack);
        mqtt_client.end();
    }
    if (options.exit) {
        process.exit();
        mqtt_client.end();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));