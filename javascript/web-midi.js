WebMidi.enable(function (err) {
    if (err) {
        console.log("WebMidi could not be enabled.", err);
    } else {
        console.log("WebMidi enabled!");
    }

    console.log(WebMidi.inputs);
    console.log(WebMidi.outputs);

    var input = WebMidi.getInputByName("KeyStudio");
    //var input = WebMidi.getInputByName("VMPK Output");
    

    input.addListener('noteon', "all", function(e) {
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
    input.addListener('noteoff', "all", function(e) {
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
    input.addListener('pitchbend', "all", function (e) {
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

    input.addListener('controlchange', "all", function (e) {
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
});