var utp = require('utp-native')

var server = utp.createServer(function (socket) {
  socket.pipe(socket) // echo server
})

server.listen(10000, function () {
  var socket = utp.connect(10000)

  socket.write('hello world')
  socket.on('data', function (data) {
    console.log('echo: ' + data)
  })
})
