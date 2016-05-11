var net = require('utp-native');
var fs = require('fs');

var Transform = require('stream').Transform;
var server = net.createServer();

var stream = fs.createReadStream('grid.tar.gz');
var wS = fs.createWriteStream('out.tar.gz');

server.listen(8000);

var prefixer = new Transform({
  decodeStrings : false
});


server.on('connection', function(client) {
  stream.pipe(client);

  stream.on('finish', function() {
    client.close();
  });
  //client.pipe(stream);
  //client.write('hey');
});

//var socket = new net.Socket();
var i = 0;

var socket = net.connect(8000);

socket.on('data', function(data) {
  //wS.write(data);
  console.log('---------------------------', i++);
  // if (i == 1)
  //   console.log(data.toString());
  //socket.close();
  //console.log(data.toString())
});

socket.on('close', function() {
  process.exit(0);
});
