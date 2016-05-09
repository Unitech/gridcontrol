var net = require('net');
var JsonSocket = require('json-socket');
var SocketRouter = require('socket-router');

var socketServer = new JsonSocket(new net.Socket());
socketServer.connect(3500, '127.0.0.1');

JsonSocket.prototype.send = JsonSocket.prototype.sendMessage; //TODO: Hack :/

var server = new SocketRouter.Client(socketServer);

server.send('addition', { a: 4, b: 8 }, function(err, data) {
  if(err) throw err;
  console.log("Answer:", data.result);
});
