var gossip = require('secure-gossip')

var peer1 = gossip()
var peer2 = gossip()
var peer3 = gossip()

var p1 = peer1.createPeerStream()
var p2_1 = peer2.createPeerStream()
var p2_2 = peer2.createPeerStream()
var p3 = peer3.createPeerStream()

// 3 peers in a line, with peer-2 in the middle
p1.pipe(p2_1).pipe(p1)
p2_2.pipe(p3).pipe(p2_2)

// have p1 publish, and watch it propogate to p2 and then p3
peer1.publish({
  data: 'hello warld'
})

peer1.on('message', function (msg) {
  console.log('p1 message', msg)
})

peer2.on('message', function (msg) {
  console.log('p2 message', msg)
})

peer3.on('message', function (msg) {
  console.log('p3 message', msg)
})
