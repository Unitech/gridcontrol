
var SocketRouter = require('./socket_router.js');

var SocketPool = function() {
  this._socket_pool = {};
};

SocketPool.prototype.add = function(socket) {
  var peer = new SocketRouter(socket);
  var that = this;

  socket.on('error', function() {
    delete that._socket_pool[peer.uuid];
    peer.kill();
  });

  socket.on('close', function() {
    delete that._socket_pool[peer.uuid];
    peer.kill();
  });

  this._socket_pool[peer.uuid] = peer;

  return peer;
};

SocketPool.prototype.close = function() {
  var that = this;

  Object.keys(this._socket_pool).forEach(function(uid) {
    that._socket_pool[uid].kill();
  });
};

SocketPool.prototype.getSockets = function() {
  var ret = [];
  var that = this;

  Object.keys(this._socket_pool).forEach(function(key) {
    ret.push(that._socket_pool[key].socket);
  });

  return ret;
};

SocketPool.prototype.getSocketRouters = function() {
  var ret = [];
  var that = this;

  Object.keys(this._socket_pool).forEach(function(key) {
    ret.push(that._socket_pool[key]);
  });

  return ret;
};

SocketPool.prototype.broadcast = function(route, data) {
  this.getSocketRouters().forEach(function(router) {
    router.send(route, data);
  });
};


module.exports = SocketPool;
