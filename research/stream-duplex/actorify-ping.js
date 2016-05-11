var net = require('net');
var actorify = require('actorify');

// server

net.createServer(function(sock){
  var actor = actorify(sock);

  actor.on('ping', function(){
    console.log('PING');
    actor.send('pong');
  });
}).listen(3000);

// client

var sock = net.connect(3000);
var actor = actorify(sock);

setInterval(function(){
  actor.send('ping');
  actor.once('pong', function(){
    console.log('PONG');
  });
}, 300);
