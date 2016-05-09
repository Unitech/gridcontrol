
var fs = require('fs');
var net = require('net');
var server = net.createServer();

server.on('connection', function(socket) {
  console.log('New connection');
  var sync = fs.createReadStream('./LICENSE.txt');

  sync.on('error', function(e) {
    console.error(e);
  });
  sync.on('open', function() {
    sync
      .pipe(socket);
  });

  sync.on('finish', function() {
    socket.end();
  });
});

server.listen(9999, function() {
  console.log('File Server instancied, listening on 9999');

});


var dest = fs.createWriteStream('fuckthisshit');
var called = false;

var client = new net.Socket();

client.connect(9999, function(sock) {
  console.log('Client connected');
});

client.on('data', data => {
  dest.write(data);
});

client.on('end', function() {
  console.log('end');
});
