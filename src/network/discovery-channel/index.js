var dns = require('dns-discovery')
//var dht = require('bittorrent-dht')
var thunky = require('thunky')
var crypto = require('crypto')
var events = require('events')
var util = require('util')

module.exports = Discovery

function Discovery (opts) {
  if (!(this instanceof Discovery)) return new Discovery(opts)
  if (!opts) opts = {}

  var self = this

  this.dht = opts.dht === false ? null : null;

  this.dns = opts.dns === false ? null : dns(opts.dns)
  if (this.dns) this.dns.on('peer', ondnspeer)
  if (this.dht) this.dht.on('peer', ondhtpeer)
  this.destroyed = false
  this.me = {host: null, port: 0}

  this._dhtInterval = opts.dht && opts.dht.interval
  this._dnsInterval = opts.dns && opts.dns.interval
  this._announcing = {}
  this._unsha = {}
  this._whoami = this.dns && this.dns.whoami && thunky(whoami)
  if (this._whoami) this._whoami()

  events.EventEmitter.call(this)

  function whoami (cb) {
    self.dns.whoami(function (_, me) {
      if (me) {
        self.me = me
        self.emit('whoami', me)
      }
      cb()
    })
  }

  function ondhtpeer (peer, infoHash) {
    if (self.destroyed) return
    var id = self._unsha[infoHash.toString('hex')]
    if (id) self.emit('peer', id, peer, 'dht')
  }

  function ondnspeer (name, peer) {
    if (self.destroyed) return
    var id = self._unsha[name]
    if (id) self.emit('peer', id, peer, 'dns')
  }
}

util.inherits(Discovery, events.EventEmitter)

Discovery.prototype.join = function (id, port, opts) {
  if (this.destroyed) return
  if (typeof id === 'string') id = new Buffer(id)
  if (!opts) opts = {}

  var announcing = typeof port === 'number'
  if (!port) port = 0

  var self = this
  var name = id.toString('hex')
  var key = name + ':' + port
  var sha1 = crypto.createHash('sha1').update(id).digest()
  var sha1hex = sha1.toString('hex')
  var dnsTimeout = null
  var dhtTimeout = null
  var destroyed = false
  var publicPort = 0
  var skipMulticast = false

  if (this._announcing[key]) return

  this._unsha[sha1hex] = id
  this._announcing[key] = {
    id: id,
    port: port,
    destroy: destroy
  }

  if (!opts.impliedPort || !this._whoami) return ready()

  if (this.dns) {
    if (announcing) this.dns.announce(sha1hex, port, {server: false})
    else this.dns.lookup(sha1hex, {server: false})
  }

  this._whoami(function () {
    if (destroyed) return
    if (self.me && self.me.port) publicPort = self.me.port
    skipMulticast = true
    ready()
  })

  function ready () {
    if (self.dns) dns()
    if (self.dht) dht()
  }

  function destroy () {
    destroyed = true
    clearTimeout(dnsTimeout)
    clearTimeout(dhtTimeout)
    delete self._unsha[sha1hex]
    if (self.dns) self.dns.unannounce(sha1hex, port)
  }

  function dns () {
    if (announcing) self.dns.announce(sha1hex, port, {publicPort: publicPort, multicast: !skipMulticast})
    else self.dns.lookup(sha1hex, {multicast: !skipMulticast})
     // TODO: this might be to aggressive?
    skipMulticast = false
    dnsTimeout = setTimeout(dns, this._dnsInterval || (60 * 1000 + (Math.random() * 10 * 1000) | 0))
  }

  function dht () {
    if (announcing) self.dht.announce(sha1, publicPort || port)
    else self.dht.lookup(sha1)
    dhtTimeout = setTimeout(dht, this._dhtInterval || (10 * 60 * 1000 + (Math.random() * 5 * 60 * 1000) | 0))
  }
}

Discovery.prototype.leave = function (id, port) {
  if (this.destroyed) return
  if (!port) port = 0
  if (typeof id === 'string') id = new Buffer(id)
  var key = id.toString('hex') + ':' + port
  if (!this._announcing[key]) return
  this._announcing[key].destroy()
  delete this._announcing[key]
}

Discovery.prototype.update = function () {
  var all = this.list()
  for (var i = 0; i < all.length; i++) {
    all[i].destroy()
    this.remove(all[i].id, all[i].port)
    this.add(all[i].id, all[i].port)
  }
}

Discovery.prototype.list = function () {
  var keys = Object.keys(this._announcing)
  var all = new Array(keys.length)
  for (var i = 0; i < keys.length; i++) {
    var ann = this._announcing[keys[i]]
    all[i] = {id: ann.id, port: ann.port}
  }
  return all
}

Discovery.prototype.destroy = function (cb) {
  if (this.destroyed) {
    if (cb) process.nextTick(cb)
    return
  }
  this.destroyed = true
  var keys = Object.keys(this._announcing)
  for (var i = 0; i < keys.length; i++) this._announcing[keys[i]].destroy()
  this._announcing = {}
  if (cb) this.once('close', cb)
  var self = this

  if (!this.dht) ondhtdestroy()
  else this.dht.destroy(ondhtdestroy)

  function ondhtdestroy () {
    if (!self.dns) ondnsdestroy()
    else self.dns.destroy(ondnsdestroy)
  }

  function ondnsdestroy () {
    self.emit('close')
  }
}
