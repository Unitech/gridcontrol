var tape = require('tape')
var airswarm = require('./')

tape('connects', function (t) {
  t.plan(3)

  var once1 = true
  var once2 = true

  airswarm(process.pid + '-testing--', function (sock) {
    t.ok(once1, 'got socket')
    once1 = false
    sock.on('data', function (data) {
      t.same(data.toString(), '+')
    })
  })

  airswarm(process.pid + '-testing--', function (sock) {
    t.ok(once2, 'got socket')
    once2 = false
    sock.write('+')
  })
})

tape('exits', function (t) {
  t.end()
  process.exit(0)
})
