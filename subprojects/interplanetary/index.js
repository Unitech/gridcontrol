var discovery   = require('discovery-channel');
var pump        = require('pump');
var events      = require('events');
var util        = require('util');
var tls         = require('tls');
var equals      = require('buffer-equals');
var toBuffer    = require('to-buffer');
var crypto      = require('crypto');
var lpmessage   = require('length-prefixed-message');
var connections = require('connections');

try {
  // Deactivate UTP connection
  // Because we cannot pass certificates
  // var utp = require('utp-native')
} catch (err) {
  // do nothing
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var utp = null;

var PEER_SEEN = 1
var PEER_BANNED = 2

var HANDSHAKE_TIMEOUT = 5000
var CONNECTION_TIMEOUT = 3000
var RECONNECT_WAIT = [1000, 1000, 5000, 15000]
// var DEFAULT_SIZE = 100 // TODO enable max connections

module.exports = InterPlanetary;

/**
 * Interplanetary is a powerful discovery system
 * based on discovery-swarm
 * It link machines together in the same subnetwork via DNS multicast
 * And over the internet via the Bittorrent Distributed Hash Table (DHT)
 *
 * @constructor
 * @param opts           {object} options
 * @param opts.maxConnections
 * @param opts.id        {string} unique id for host
 * @param opts.stream ??
 * @param opts.discovery {boolean} default:true activate/deactivate discovery
 * @param opts.tcp       {boolean} default:true activate/deactivate TCP connection
 * @param opts.utp       {boolean} (deprecated) activate/deactivate UTP connection
 * @param opts.dns       {boolean} default:true activate/deactivate DNS discovery
 * @param opts.dht       {boolean} default:true activate/deactivate DHT discovery
 * @param opts.tls       {object}
 * @param opts.tls.key   {string} readable private key
 * @param opts.tls.cert  {string} readable public key
 */
function InterPlanetary (opts) {
  if (!(this instanceof InterPlanetary))
    return new InterPlanetary(opts);
  if (!opts)
    opts = {};
  events.EventEmitter.call(this);

  var self = this;

  this._opts = opts || {};

  if (!this.opts.tls) {
    throw new Error('No certificates!');
  }

  this.maxConnections = this._opts.maxConnections || 0;
  this.totalConnections = 0;

  this.connections = [];
  this.id = this._opts.id || crypto.randomBytes(32);
  this.destroyed = false;

  this._stream = this._opts.stream;
  this._discovery = null;
  this._tcp = this._opts.tcp === false ? null : tls.createServer(this._opts.tls).on('connection', onconnection);
  this._utp = this._opts.utp === false || !utp ? null : utp().on('connection', onconnection);
  this._tcpConnections = this._tcp && connections(this._tcp);
  this._adding = null;
  this._listening = false;

  this._peersIds = {};
  this._peersSeen = {};
  this._peersQueued = [];

  if (this._opts.discovery !== false)
    this.on('listening', this._ondiscover);

  function onconnection (connection) {
    var type = this === this._tcp ? 'tcp' : 'utp'
    connection.on('error', onerror)
    self._onconnection(connection, type, null)
  }
}

util.inherits(InterPlanetary, events.EventEmitter)

InterPlanetary.prototype.close =
InterPlanetary.prototype.destroy = function (onclose) {
  if (this.destroyed) return process.nextTick(onclose || noop)
  if (onclose) this.once('close', onclose)
  if (this._listening && this._adding) return this.once('listening', this.destroy)

  this.destroyed = true
  if (this._discovery) this._discovery.destroy()

  var self = this
  var missing = 0

  if (this._utp) {
    missing++
    for (var i = 0; i < this._utp.connections.length; i++) {
      this._utp.connections[i].destroy()
    }
  }

  if (this._tcp) {
    missing++
    this._tcpConnections.destroy()
  }

  if (this._listening) {
    if (this._tcp) this._tcp.close(onserverclose)
    if (this._utp) this._utp.close(onserverclose)
  }

  function onserverclose () {
    if (!--missing) self.emit('close')
  }
}

InterPlanetary.prototype.__defineGetter__('queued', function () {
  return this._peersQueued.length
})

InterPlanetary.prototype.__defineGetter__('connecting', function () {
  return this.totalConnections - this.connections.length
})

InterPlanetary.prototype.__defineGetter__('connected', function () {
  return this.connections.length
})

InterPlanetary.prototype.join = function (name) {
  name = toBuffer(name)

  if (!this._listening && !this._adding) this._listenNext()

  if (this._adding) {
    this._adding.push(name)
  } else {
    this._discovery.join(name, this._tcp.address().port, {impliedPort: !!this._utp})
  }
}

InterPlanetary.prototype.leave = function (name) {
  name = toBuffer(name)

  if (this._adding) {
    for (var i = 0; i < this._adding.length; i++) {
      if (equals(this._adding[i], name)) {
        this._adding.splice(i, 1)
        return
      }
    }
  } else {
    this._discovery.leave(name, this._tcp.address().port)
  }
}

InterPlanetary.prototype.addPeer = function (peer) {
  peer = peerify(peer)
  if (this._peersSeen[peer.id]) return
  this._peersSeen[peer.id] = PEER_SEEN
  this._peersQueued.push(peer)
  this.emit('peer', peer)
  this._kick()
}

InterPlanetary.prototype.removePeer = function (peer) {
  peer = peerify(peer)
  this._peersSeen[peer.id] = PEER_BANNED
  // delete this._peersSeen[peer.id]
}

InterPlanetary.prototype.address = function () {
  return this._tcp ? this._tcp.address() : this._utp.address()
}

InterPlanetary.prototype._ondiscover = function () {
  var self = this
  var names = this._adding

  if (this._opts.dns !== false) {
    if (!this._opts.dns || this._opts.dns === true) this._opts.dns = {}
    this._opts.dns.socket = this._utp
  }

  if (this._opts.dht !== false) {
    if (!this._opts.dht || this._opts.dht === true) this._opts.dht = {}
    this._opts.dht.socket = this._utp
  }

  this._discovery = discovery(this._opts)
  this._discovery.on('peer', onpeer)
  this._discovery.on('whoami', onwhoami)
  this._adding = null

  if (!names) return
  for (var i = 0; i < names.length; i++) this.join(names[i])

  function onwhoami (me) {
    self._peersSeen[me.host + ':' + me.port] = PEER_BANNED
  }

  function onpeer (channel, peer) {
    var id = peer.host + ':' + peer.port
    if (self._peersSeen[id]) return
    self._peersSeen[id] = PEER_SEEN
    self._peersQueued.push(peerify(peer))
    self.emit('peer', peer)
    self._kick()
  }
}

InterPlanetary.prototype._kick = function () {
  if (this.maxConnections && this.totalConnections >= this.maxConnections) return
  if (this.destroyed) return

  var self = this
  var connected = false
  var next = this._peersQueued.shift()
  while (next && this._peersSeen[next.id] === PEER_BANNED) {
    next = this._peersQueued.shift()
  }

  if (!next) return

  this.totalConnections++
  this.emit('connecting', next)

  var tcpSocket = null
  var utpSocket = null
  var tcpClosed = true
  var utpClosed = true

  if (this._tcp) {
    tcpClosed = false;
    tcpSocket = tls.connect(next.port, next.host, this._opts.tls);
    tcpSocket.on('connect', onconnect);
    tcpSocket.on('error', onerror);
    tcpSocket.on('close', onclose);
    this._tcpConnections.add(tcpSocket);
  }

  if (this._utp) {
    utpClosed = false
    utpSocket = this._utp.connect(next.port, next.host);
    utpSocket.on('connect', onconnect);
    utpSocket.on('error', onerror);
    utpSocket.on('close', onclose);
  }

  var timeout = setTimeoutUnref(ontimeout, CONNECTION_TIMEOUT)

  function ontimeout () {
    if (utpSocket) utpSocket.destroy()
    if (tcpSocket) tcpSocket.destroy()
  }

  function onclose () {
    if (this === utpSocket) utpClosed = true
    if (this === tcpSocket) tcpClosed = true
    if (tcpClosed && utpClosed) {
      clearTimeout(timeout)
      if (utpSocket) utpSocket.removeListener('close', onclose)
      if (tcpSocket) tcpSocket.removeListener('close', onclose)
      self.totalConnections--
      if (!connected) self._requeue(next)
    }
  }

  function onconnect () {
    connected = true
    utpClosed = tcpClosed = true
    onclose() // decs totalConnections which _onconnection also incs

    var type = this === utpSocket ? 'utp' : 'tcp'

    if (type === 'utp' && tcpSocket) tcpSocket.destroy()
    if (type === 'tcp' && utpSocket) utpSocket.destroy()

    self._onconnection(this, type, next)
  }
}

InterPlanetary.prototype._requeue = function (peer) {
  if (this.destroyed) return

  var self = this
  var wait = peer.retries >= RECONNECT_WAIT.length ? 0 : RECONNECT_WAIT[peer.retries++]
  if (wait) setTimeoutUnref(requeue, wait)
  else this.emit('drop', peer)

  function requeue () {
    self._peersQueued.push(peer)
    self._kick()
  }
}

InterPlanetary.prototype._onconnection = function (connection, type, peer) {
  var self = this
  var idHex = this.id.toString('hex')
  var remoteIdHex

  this.totalConnections++
  connection.on('close', onclose)

  if (this._stream) {
    var wire = connection
    connection = this._stream(this.id)
    connection.on('handshake', onhandshake)
    pump(wire, connection, wire)
  } else {
    handshake(connection, this.id, onhandshake)
  }

  var timeout = setTimeoutUnref(ontimeout, HANDSHAKE_TIMEOUT)
  if (this.destroyed) connection.destroy()

  function ontimeout () {
    connection.destroy()
  }

  function onclose () {
    clearTimeout(timeout)
    self.totalConnections--

    var i = self.connections.indexOf(connection)
    if (i > -1) {
      var last = self.connections.pop()
      if (last !== connection) self.connections[i] = last
    }

    if (remoteIdHex && self._peersIds[remoteIdHex] === connection) {
      delete self._peersIds[remoteIdHex]
      if (peer) self._requeue(peer)
    }
  }

  function onhandshake (remoteId) {
    if (!remoteId) remoteId = connection.remoteId
    clearTimeout(timeout)
    remoteIdHex = remoteId.toString('hex')
    if (peer) peer.retries = 0

    if (idHex === remoteIdHex) {
      if (peer) self._peersSeen[peer.id] = PEER_BANNED
      connection.destroy()
      return
    }

    var old = self._peersIds[remoteIdHex]

    if (old) {
      if ((peer && remoteIdHex < idHex) || (!peer && remoteIdHex > idHex)) {
        connection.destroy()
        return
      }
      delete self._peersIds[remoteIdHex] // delete to not trigger re-queue
      old.destroy()
      old = null // help gc
    }

    self._peersIds[remoteIdHex] = connection
    self.connections.push(connection)
    self.emit('connection', connection, remoteId)
  }
}

InterPlanetary.prototype._listenNext = function () {
  var self = this
  if (!this._adding) this._adding = []
  process.nextTick(function () {
    if (!self._listening) self.listen()
  })
}

InterPlanetary.prototype.listen = function (port, onlistening) {
  if (this._tcp && this._utp) return this._listenBoth(port, onlistening)
  if (!port) port = 0
  if (onlistening) this.once('listening', onlistening)

  var self = this
  var server = this._tcp || this._utp

  if (!this._listening) {
    this._listening = true
    server.on('error', onerror)
    server.on('listening', onlisten)
  }

  if (!this._adding) this._adding = []
  server.listen(port)

  function onerror (err) {
    self.emit('error', err)
  }

  function onlisten () {
    self.emit('listening')
  }
}

InterPlanetary.prototype._listenBoth = function (port, onlistening) {
  if (typeof port === 'function') return this.listen(0, port)
  if (!port) port = 0
  if (onlistening) this.once('listening', onlistening)

  var self = this

  if (!this._adding) this._adding = []
  this._listening = true

  this._utp.on('error', onerror)
  this._utp.on('listening', onutplisten)
  this._tcp.on('listening', ontcplisten)
  this._tcp.on('error', onerror)
  this._tcp.listen(port)

  function cleanup () {
    self._utp.removeListener('error', onerror)
    self._tcp.removeListener('error', onerror)
    self._utp.removeListener('listening', onutplisten)
    self._tcp.removeListener('listening', ontcplisten)
  }

  function onerror (err) {
    cleanup()
    self._tcp.close(function () {
      if (!port) return self.listen() // retry
      self.emit('error', err)
    })
  }

  function onutplisten () {
    cleanup()
    self._utp.on('error', forward)
    self._tcp.on('error', forward)
    self.emit('listening')
  }

  function ontcplisten () {
    self._utp.listen(this.address().port)
  }

  function forward (err) {
    self.emit('error', err)
  }
}

function handshake (socket, id, cb) {
  lpmessage.write(socket, id)
  lpmessage.read(socket, cb)
}

function onerror () {
  this.destroy()
}

function peerify (peer) {
  if (typeof peer === 'number') peer = {port: peer}
  if (!peer.host) peer.host = '127.0.0.1'
  peer.id = peer.host + ':' + peer.port
  peer.retries = 0
  return peer
}

function setTimeoutUnref (fn, time) {
  var timeout = setTimeout(fn, time)
  if (timeout.unref) timeout.unref()
  return timeout
}

function noop () {}
