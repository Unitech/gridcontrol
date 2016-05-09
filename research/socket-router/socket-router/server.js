
var net = require('net');
var JsonSocket = require('json-socket');
var SocketRouter = require('socket-router');

var server = new SocketRouter.Server();
var socketServer = net.createServer();

socketServer.listen(3500);

JsonSocket.prototype.send = JsonSocket.prototype.sendMessage; //TODO: Hack :/

socketServer.on('connection', function (socket) {
  server.listen(new JsonSocket(socket));
});

server.route('addition', function(data, reply) {
  console.log(data);
  reply({ result: data.a + data.b });
});
