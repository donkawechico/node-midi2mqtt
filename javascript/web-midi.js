WebMidi.enable(function (err) {
    if (err) {
        console.log("WebMidi could not be enabled.", err);
    } else {
        console.log("WebMidi enabled!");
    }

    console.log(WebMidi.inputs);
    console.log(WebMidi.outputs);

    var input = WebMidi.getInputByName("KeyStudio");

    input.addListener('noteon', "all", function(e) {
        $.ajax(
          {
            url: '/mqtt/turnon', 
            type: 'POST', 
            contentType: 'application/json', 
            data: JSON.stringify({note: { number: e.note.number, name: e.note.name, octave: e.note.octave } })
          }
        );
        console.log("Note on: " + e.note.number + " " + e.note.name + " " + e.note.octave);
    });
    input.addListener('noteoff', "all", function(e) {
        $.ajax(
          {
            url: '/mqtt/turnoff', 
            type: 'POST', 
            contentType: 'application/json', 
            data: JSON.stringify({note: { number: e.note.number, name: e.note.name, octave: e.note.octave } })
          }
        );
        console.log("Note off: " + e.note.number + " " + e.note.name + " " + e.note.octave);
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
});