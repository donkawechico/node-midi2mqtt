'use strict';

require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');
const MidiPlayer = require('midi-player-js');
const AiLights   = require('./ai_light');

const app    = express();
const lights = new AiLights();

// ── MIDI file player ──────────────────────────────────────────────────────
const Player = new MidiPlayer.Player(function (event) {
    if (!event.name || !event.noteName) return;

    const note = event.noteName.replace(/[0-9]+$/, '').trim();
    const light = lights.lightForNote(note);
    if (!light) return;

    if (event.name === 'Note on' && event.velocity > 0) {
        const brightness = Math.round((event.velocity / 127) * 255);
        light.turn_on(brightness);
    } else if (event.name === 'Note off' || (event.name === 'Note on' && event.velocity === 0)) {
        light.turn_off();
    }
});

// ── Middleware ────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('node_modules/webmidi'));
app.use(express.static('javascript'));

// ── Utility ───────────────────────────────────────────────────────────────
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/status', (req, res) => {
    res.json({ mqtt_connected: lights.isConnected() });
});

app.post('/mqtt/loadmidi', (req, res) => {
    const midifile = req.body.midi_path;
    if (!midifile) return res.status(400).send('midi_path required');
    try {
        Player.loadFile(midifile);
        Player.play();
        res.send('Playing: ' + midifile);
    } catch (err) {
        res.status(400).send('Could not load file: ' + err.message);
    }
});

app.post('/mqtt/turnon', (req, res) => {
    const light = lights.lightForNote(req.body.note.name);
    if (!light) return res.status(400).send('unknown note: ' + req.body.note.name);
    const brightness = Math.round(mapRange(req.body.note.velocity, 0, 1, 0, 255));
    light.turn_on(brightness);
    res.send('on: ' + light.name);
});

app.post('/mqtt/turnoff', (req, res) => {
    const light = lights.lightForNote(req.body.note.name);
    if (!light) return res.status(400).send('unknown note: ' + req.body.note.name);
    light.turn_off();
    res.send('off: ' + light.name);
});

app.post('/mqtt/pitchbend', (req, res) => {
    const raw = parseFloat(req.body.bend_value);
    const brightness = Math.round(((raw + 1) / 2) * 255);
    // lights.setBrightnessForOnLights(brightness); // uncomment to enable
    res.send('bend: ' + brightness);
});

app.post('/mqtt/controlchange', (req, res) => {
    const name  = req.body.control.controller.name;
    const value = parseInt(req.body.control.value, 10);

    switch (name) {
        case 'holdpedal':
            lights.setPedalState(value > 0);
            if (value === 0) lights.turnOffAllPendingOffLights();
            break;
        // case 'volumecoarse':
        //     lights.setTempForOnLights(Math.round(mapRange(value, 0, 127, 154, 500)));
        //     break;
    }

    res.send('cc: ' + name);
});

// ── Start ─────────────────────────────────────────────────────────────────
function listen(port) {
    const server = app.listen(port, () =>
        console.log('midi2mqtt listening on http://localhost:' + port));
    server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
            console.log('port ' + port + ' in use, trying ' + (port + 1));
            listen(port + 1);
        } else {
            throw err;
        }
    });
}
listen(3000);

process.stdin.resume();
process.on('SIGINT', () => { lights.disconnect(); process.exit(0); });
process.on('uncaughtException', err => { console.error('uncaught:', err); process.exit(1); });
