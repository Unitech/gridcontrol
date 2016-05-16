
var debug           = require('debug')('network');
var socketrouter    = require('./socket-router.js');
var securesocketrouter    = require('./secure-socket-router.js');

var SocketPool = function() {
  this._socket_pool = {};
};

SocketPool.prototype.add = function(socket, local_identity, cb) {
  var peer = securesocketrouter(socket);
  var that = this;

  socket.on('error', function(e) {
    if (that._socket_pool[peer.id] && that._socket_pool[peer.id].identity)
      debug('peer %s errored', that._socket_pool[peer.id].identity.public_ip);
    else
      debug('unknow peer errored');
    delete that._socket_pool[peer.id];
  });

  socket.on('close', function() {
    if (that._socket_pool[peer.id] && that._socket_pool[peer.id].identity)
      debug('status=connection_close from=%s[%s]',
            that._socket_pool[peer.id].identity.name,
            that._socket_pool[peer.id].identity.public_ip);
    else
      debug('unknow peer left');

    delete that._socket_pool[peer.id];
  });

  peer.on('ctx:success', function() {

    peer.on('identity', function(data) {
      debug('status=identity meta info from=%s[%s]',
            data.name,
            data.public_ip);
      peer.identity = data;
      // Set peer flag as not synchronized
      peer.identity.synchronized = false;
      that._socket_pool[peer.id] = peer;
      return cb(null, peer);
    });

    peer.send('identity', local_identity);
});
};

SocketPool.prototype.close = function() {
  var that = this;

  // Object.keys(this._socket_pool).forEach(function(id) {
  //   that._socket_pool[id].stream.close();
  // });
};

SocketPool.prototype.getRouters = function() {
  var ret = [];
  var that = this;

  Object.keys(this._socket_pool).forEach(function(key) {
    ret.push(that._socket_pool[key]);
  });

  return ret;
};

SocketPool.prototype.broadcast = function(route, data) {
  this.getRouters().forEach(function(router) {
    router.send(route, data);
  });
};


module.exports = SocketPool;
