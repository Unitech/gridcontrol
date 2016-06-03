var test = require('tape')
var DC = require('./index.js')
var crypto = require('crypto')

test('list', function (t) {
  var channel = DC({dht: false, dns: false})
  var id = crypto.randomBytes(32)

  channel.join(id)
  t.same(channel.list(), [{id: id, port: 0}])

  channel.leave(id)
  channel.join(id, 8080)
  t.same(channel.list(), [{id: id, port: 8080}])

  channel.leave(id)
  t.same(channel.list(), [{id: id, port: 8080}])

  channel.leave(id, 8080)
  t.same(channel.list(), [])

  channel.destroy()
  t.end()
})

test('find each other', function (t) {
  var id = crypto.randomBytes(32)
  var pending = 2
  t.plan(2)

  var channel1 = DC()
  var channel2 = DC()

  channel1.join(id, 1337)
  channel2.join(id, 7331)

  channel1.on('peer', function (hash, peer) {
    if (peer.port === 7331) {
      t.pass('found second channel')
      done()
    }
  })

  channel2.on('peer', function (hash, peer) {
    if (peer.port === 1337) {
      t.pass('found first channel')
      done()
    }
  })

  function done () {
    if (--pending) return
    channel1.destroy()
    channel2.destroy()
  }
})
