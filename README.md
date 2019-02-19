# node-midi-2-mqtt

## Installation
1. Clone repo
2. npm i
3. mv .env.sample .env
4. Change values in .env to match mqtt server
5. On mac, in spotlight, look for "audio midi setup"
6. Click on "View -> Midi something something"
7. Double-click on IAC driver and click "enable" checkbox
8. (Perform either the keyboard steps, or playing midi file steps below)
9. npm run start
10. Open localhost:3000 in a browser

### If using keyboard
1. Plug in keyboard
2. Plug in audio cable from speakers to mac (optional)
3. Open Garage Band

### If playing MIDI file
1. Go to Audio Midi Setup, double-click the IAC Driver
2. Click the "+" sign to add a second Bus
3. Open "MuseScore3"
4. Click on "Open Score" and select midi file
5. Click Preferences -> IO tab
6. In MIDI Output dropdown, select the second Bus you just added
7. Midi Input should be the first Bus
8. Close preferences
9. Open Garage Band

