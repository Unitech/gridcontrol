var test = require('tape')
var swarm = require('./')

test('two swarms connect locally', function (t) {
  var pending = 0
  var swarms = []

  create()
  create()

  function create () {
    var s = swarm({dht: false, utp: false})
    swarms.push(s)
    pending++
    s.join('test')

    s.on('connection', function (connection, type) {
      t.ok(connection, 'got connection')
      if (--pending === 0) {
        swarms.forEach(function (s) {
          s.destroy()
        })
        t.end()
      }
    })

    return s
  }
})

test('two swarms connect and exchange data', function (t) {
  var a = swarm({dht: false, utp: false})
  var b = swarm({dht: false, utp: false})

  a.on('connection', function (connection) {
    connection.write('hello')
    connection.on('data', function (data) {
      a.destroy()
      b.destroy()
      t.same(data, Buffer('hello'))
      t.end()
    })
  })

  b.on('connection', function (connection) {
    connection.pipe(connection)
  })

  a.join('test')
  b.join('test')
})

test('connect many and send data', function (t) {
  var runs = 10
  var outer = 0
  var swarms = []

  for (var i = 0; i < runs; i++) create(i)

  function create (i) {
    var s = swarm({dht: false, utp: false})
    swarms.push(s)

    var seen = {}
    var cnt = 0

    s.on('connection', function (connection) {
      connection.write('' + i)
      connection.on('data', function (data) {
        if (seen[data]) return
        seen[data] = true
        t.pass('swarm #' + i + ' received ' + data)
        if (++cnt < runs - 1) return
        if (++outer < runs) return
        swarms.forEach(function (other) {
          other.destroy()
        })
        t.end()
      })
    })

    s.join('test')
  }
})

test('socket should get destroyed on a bad peer', function (t) {
  var s = swarm({dht: false, utp: false})

  s.addPeer(10003) // should not connect

  process.nextTick(function () {
    t.equal(s.totalConnections, 1, '1 connection')
  })

  s.on('connection', function (connection, type) {
    t.false(connection, 'should never get here')
    s.destroy()
    t.end()
  })

  setTimeout(function () {
    t.equal(s.totalConnections, 0, '0 connections')
    s.destroy()
    t.end()
  }, 250)
})
