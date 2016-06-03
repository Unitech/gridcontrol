var DC = require('./index.js')
var channel = DC({
  dns: {
    servers: [
      'discovery1.publicbits.org',
      'discovery2.publicbits.org'
    ]
  }
})

var hash = new Buffer('deadbeefbeefbeefbeefdeadbeefbeefbeefbeef', 'hex')

channel.on('whoami', function (me) {
  console.log('I am ' + me.host + (me.port ? ':' + me.port : '') + ' on the internet')
})

channel.join(hash, Number(process.argv[2] || 1337))
