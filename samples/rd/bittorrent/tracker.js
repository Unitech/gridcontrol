var Server = require('bittorrent-tracker').Server;

var server = new Server({
  udp: true, // enable udp server? [default=true]
  http: true, // enable http server? [default=true]
  ws: true, // enable websocket server? [default=true]
  stats: true // enable web-based statistics? [default=true]
});

server.on('error', function (err) {
  // fatal server error!
  console.log(err.message);
});

server.on('warning', function (err) {
  // client sent bad data. probably not a problem, just a buggy client.
  console.log(err.message);
});

server.on('listening', function () {
  // fired when all requested servers are listening
  console.log('listening on http port:' + server.http.address().port);
  console.log('listening on udp port:' + server.udp.address().port);
});

server.on('start', function (addr) {
  console.log('got start message from ' + addr);
});

server.listen(0, function() {

});
