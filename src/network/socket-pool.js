
var socketrouter = require('./socket-router.js');

var SocketPool = function() {
  this._socket_pool = {};
};

SocketPool.prototype.add = function(socket) {
  var peer = socketrouter(socket);
  var that = this;

  socket.on('error', function() {
    delete that._socket_pool[peer.id];
  });

  socket.on('close', function() {
    delete that._socket_pool[peer.id];
  });

  this._socket_pool[peer.id] = peer;

  return peer;
};

SocketPool.prototype.close = function() {
  var that = this;

  // Object.keys(this._socket_pool).forEach(function(id) {
  //   that._socket_pool[id].stream.close();
  // });
};

SocketPool.prototype.getSockets = function() {
  var ret = [];
  var that = this;

  Object.keys(this._socket_pool).forEach(function(key) {
    ret.push(that._socket_pool[key]);
  });

  return ret;
};

SocketPool.prototype.broadcast = function(route, data) {
  this.getSockets().forEach(function(router) {
    router.send(route, data);
  });
};


module.exports = SocketPool;
