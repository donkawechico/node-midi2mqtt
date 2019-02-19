require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
var AiLights = require("./ai_light");
var bodyParser = require('body-parser');
var noteStream = require("web-midi-note-stream");
var midiStream = require('web-midi');
var stdout = require("stdout");
var MidiPlayer = require('midi-player-js');

 // Initialize player and register event handler
var Player = new MidiPlayer.Player(function(event) {
	console.log(event);
});


var api_call_count = 0;

lights = new AiLights();

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json())
app.use(express.static("node_modules/webmidi"));
app.use(express.static("javascript"));

Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.post('/mqtt/loadmidi', function(req, res) {
    // Listen to all button presses, parse them, log to console 
    // midiStream("Launchpad")
    //     .pipe(noteStream())
    //     .pipe(stdout("Note:"));
    midifile = req.body.midi_path;
    Player.loadFile(midifile);
    Player.play();

    res.send('Turning on ' + light.name + 'from note ' + req.body.note.name);
});

app.post('/mqtt/turnon', function(req, res) {
    light = lights.lightForNote(req.body.note.name);
    brightness=Math.round(req.body.note.velocity.map(0,1,0,255));
    light.turn_on(brightness);

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

    // if (api_call_count++%5==0 || raw_value == 0.0 || Math.abs(raw_value) > 0.95) { 
    //     lights.setBrightnessForOnLights(brightness);
    //     api_call_count = 1;
    // }

    res.send('Pitch value found: "' + brightness + '".');
});

app.post('/mqtt/controlchange', function(req, res) {
    var controlName = req.body.control.controller.name;
    var raw_value = req.body.control.value;
    var mapped_value = Math.round(raw_value.map(0,127,154,500));
    console.log("mapped value in control change: " + mapped_value);
    switch (controlName) {
        // case "volumecoarse": 
        //     lights.setTempForOnLights(mapped_value); 
        //     break;
        // case "modulationwheelcoarse": 
        //     //lights.set
        //     break;
        case "holdpedal": 
            if (parseInt(req.body.control.value) > 0) {
                lights.setPedalState(true);
                console.log("Pedal depressed");
                //lights.setAllLightsToHoldLights();
            } else {
                lights.setPedalState(false);
                lights.turnOffAllPendingOffLights();
                console.log("Pedal released");
                // lights.setAllLightsToNormalLights();
                // lights.turnOffAllLights();
            }
                
            break;
    }
    
    
    res.send('Pitch value found: "' + controlName + '".');
});

// function normalizeNumberToRange(valueToConvert,minForValue,maxForValue,adjustmentRangeMin,adjustmentRangeMax) {

// }

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