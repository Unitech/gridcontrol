var airswarm = require('airswarm');
var fs = require('fs');
var sockets = [];

var input = fs.createReadStream('./hello');

var connection = airswarm('testing', function (sock) {
  console.log('New peer connected on IP %s', sock.remoteAddress);

  sock.on('close', function() {
    console.log('Sock on ip %s disconnected', sock.remoteAddress);
  });

  sock.on('data', function(data) {
    var dt = JSON.parse(data);
    console.log(dt);
  });

  //input.pipe(sock);

});

setInterval(function() {
  console.log('Sockets connected %d', connection.peers.length);
}, 3000);

// var address = require('network-address');
// console.log(address());
