WebMidi.enable(function (err) {
    if (err) {
        console.log("WebMidi could not be enabled.", err);
    } else {
        console.log("WebMidi enabled!");
    }

    console.log(WebMidi.inputs);
    console.log(WebMidi.outputs);

    var load_midi = document.getElementById("loadmidi");

    load_midi.addEventListener('click', function(e) {
       console.log("Clicked on button"); 
       $.ajax(
              {
                url: '/mqtt/loadmidi', 
                type: 'POST', 
                contentType: 'application/json', 
                data: JSON.stringify({midi_path: "./bohemian_rhapsody.mid"})
              }
        );
    });
    channel = "1";
    // var input = WebMidi.getInputByName("KeyStudio");
    // var input = WebMidi.getInputByName("IAC Driver Bus 1");
    // var input = WebMidi.getInputByName("IAC Driver Output");
    var input = WebMidi.getInputByName("IAC Driver IAC Bus 2");
    callEndpoint = function(endpoint, data) {
        $.ajax(
        {
            url: endpoint, 
            type: 'POST', 
            contentType: 'application/json', 
            data: JSON.stringify(data)
          }
        );
    }

    if (input) {
        input.addListener('noteon', channel, function(e) {
            console.log("Note on: " + e.note.number + " " + e.note.name + " " + e.note.octave + " " + e.velocity);
            $.ajax(
              {
                url: '/mqtt/turnon', 
                type: 'POST', 
                contentType: 'application/json', 
                data: JSON.stringify({note: { number: e.note.number, name: e.note.name, octave: e.note.octave, velocity: e.velocity } })
              }
            );
        });
        input.addListener('noteoff', channel, function(e) {
            $.ajax(
              {
                url: '/mqtt/turnoff', 
                type: 'POST', 
                contentType: 'application/json', 
                data: JSON.stringify({note: { number: e.note.number, name: e.note.name, octave: e.note.octave, velocity: e.velocity } })
              }
            );

            console.log("Note off: " + e.note.number + " " + e.note.name + " " + e.note.octave + " " + e.velocity);
        });
        input.addListener('pitchbend', channel, function (e) {
            $.ajax(
              {
                url: '/mqtt/pitchbend', 
                type: 'POST', 
                contentType: 'application/json', 
                data: JSON.stringify({bend_value:e.value})
              }
            );
          console.log("Pitchbend value: ", e.value);
        });

        input.addListener('controlchange', channel, function (e) {
            $.ajax(
              {
                url: '/mqtt/controlchange', 
                type: 'POST', 
                contentType: 'application/json', 
                data: JSON.stringify({control:e})
              }
            );
          console.log("Control changed: ", e);
        });
    }
});