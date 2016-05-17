
var debug              = require('debug')('network');
var socketrouter       = require('./socket-router.js');
var securesocketrouter = require('./secure-socket-router.js');
var cs                 = require('./crypto-service.js');
var async = require('async');
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
      debug('unknow peer errored', e);
    delete that._socket_pool[peer.id];
  });

  socket.on('close', function() {
    if (that._socket_pool[peer.id] && that._socket_pool[peer.id].identity)
      debug('status=connection_close from=%s[%s]',
            that._socket_pool[peer.id].identity.name,
            that._socket_pool[peer.id].identity.public_ip);
    else
      debug('Not identified connection closed');

    delete that._socket_pool[peer.id];
  });

  async.waterfall([
    function(cb) {
      var dhObj;
      var cipher_key;

      if (socket._server) {
        peer.on('key:exchange', function(data) {
          dhObj         = cs.diffieHellman(data.prime);
          var publicKey = dhObj.publicKey;

          cipher_key  = dhObj.computeSecret(data.key);

          peer.send('key:final', {
            key : publicKey
          });

          return cb(null, {server: true, key : cipher_key});
        });
        return;
      }

      dhObj       = cs.diffieHellman();

      peer.send('key:exchange', {
        prime : dhObj.prime,
        key   : dhObj.publicKey
      });

      peer.on('key:final', function(data) {
        cipher_key = dhObj.computeSecret(data.key);

        return cb(null, {server: false, key : cipher_key});
      });

    }, function(meta, cb) {
      peer.setSecretKey(meta.key);
      debug('status=connection secured');
      cb(null, meta);
    }, function(meta, cb) {
      peer.on('identity', function(data) {
        debug('status=identity meta info from=%s[%s]',
              data.name,
              data.public_ip);
        peer.identity = data;
        peer.identity.synchronized = false;
        that._socket_pool[peer.id] = peer;

        if (meta && meta.server == true)
          peer.send('identity', local_identity);

        return cb(null, peer);
      });

      if (meta.server == false)
        peer.send('identity', local_identity);

    }], function() {
      cb(null, peer);
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
