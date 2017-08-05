require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
var testing = require("./ai_light");
var bodyParser = require('body-parser');

var api_call_count = 0;

lights = new testing();

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json())
app.use(express.static("node_modules/webmidi"));
app.use(express.static("javascript"));

app.listen(3001, function () {
  console.log('Example app listening on port 3001!')
})

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index_test.html'));
})

app.post('/mqtt/turnon', function(req, res) {
    light = lights.lightForNote(req.body.note.name);
    light.turn_on();
    res.send('Turning on ' + light.name + 'from note ' + req.body.note.name);
});
app.post('/mqtt/turnoff', function(req, res) {
    light = lights.lightForNote(req.body.note.name);
    light.turn_off();
    res.send('Turning off ' + light.name + 'from note ' + req.body.note.name);
});
app.post('/mqtt/pitchbend', function(req, res) {
    var raw_value = parseFloat(req.body.bend_value);
    var bend_value = (raw_value + 1)/2;

    var brightness = Math.round(bend_value * 255);

    if (api_call_count++%5==0 || raw_value == 0.0 || Math.abs(raw_value) > 0.95) { 
        lights.setBrightnessForOnLights(brightness);
        api_call_count = 1;
    }

    res.send('Pitch value found: "' + brightness + '".');
});

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('In exitHandler (cleanup)');
    }
    if (err) {
        console.log("In exitHandler (err): " + err);
    }
    if (options.exit) {
        console.log("In exitHandler (exit): " + err);
        process.exit();
    }

}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));