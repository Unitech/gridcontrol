var airswarm = require('airswarm');
var os       = require('os');


airswarm('testing', function (sock) {

  sock.sendJson = function(command, json) {
    var packet = {
      command : command,
      data    : json
    };
    sock.write(JSON.stringify(packet));
  };

  sock.sendJson('welcome', {
    meta : {
      hostname : os.hostname()
    }
  });

  sock.on('data', function(data) {

    // Switch commands
    // request.get files from emitter
    console.log(data.toString());
  });

  sock.on('end', function() {
    console.log('Disconnected');
  });
})
