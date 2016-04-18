var airswarm = require('airswarm')

airswarm('testing', function (sock) {
  sock.write('hello world (' + process.pid + ')\n')
  sock.pipe(process.stdout)
})
