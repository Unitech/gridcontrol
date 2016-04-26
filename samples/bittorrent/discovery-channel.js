var swarm = require('discovery-swarm')

var sw = swarm({
  dns : false
})

sw.listen(10001)
sw.join('meumeui') // can be any id/name/hash

sw.on('connection', function (connection) {
  console.log('found + connected to peer')
})
