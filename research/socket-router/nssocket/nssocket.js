var nssocket = require('nssocket');

//
// Create an `nssocket` TCP server
//
var server = nssocket.createServer(function (socket) {
  //
  // Here `socket` will be an instance of `nssocket.NsSocket`.
  //
  socket.send('test:route1', {
    filename : './client.js'
  });

  socket.data(['iam', 'here'], function (data) {
    //
    // Good! The socket speaks our language
    // (i.e. simple 'you::there', 'iam::here' protocol)
    //
    // { iam: true, indeedHere: true }
    //
    console.log(new Buffer(data.data).toString());
  })
});

//
// Tell the server to listen on port `6785` and then connect to it
// using another NsSocket instance.
//
server.listen(6785);

var outbound = new nssocket.NsSocket({
  reconnect:true
});

var fs = require('fs');

outbound.data('test:route1', function (data) {
  outbound.send(['iam', 'here'], fs.readFileSync(data.filename));
});

outbound.connect(6785);
