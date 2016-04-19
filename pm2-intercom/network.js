
var airswarm = require('airswarm');
var fs       = require('fs');
var debug    = require('debug')('network');
var Moniker  = require('moniker');

var Network = module.exports = function(ns, cb) {
  if (typeof(ns) == 'function') {
    cb = ns;
    ns = null;
  }

  this.start(ns || 'pm2:fs', cb);
  this.peer_name = Moniker.choose();
  this.peers = [];
};

Network.sendJson = function(sock, data) {
  sock.write(JSON.stringify(data));
};

Network.prototype.handle = function(sock) {
  var that = this;

  this.peers.push(sock);

  debug('New peer on %s (total=%d)', this.peer_name, this.peers.length);

  sock.on('data', function(packet) {
    packet = JSON.parse(packet);

    switch(packet.cmd) {
      // Task to synchronize this node
    case 'sync':
      filemngmt.synchronize(packet.data.url);
      break;
    default:
      console.error('Unknow CMD', packet.cmd, packet.data);
    }
  });

  if (global._task_meta.is_task_master == true) {
    // Send synchronize command
    Network.sendJson(sock, {
      cmd : 'sync',
      data : {
        url : 'http://localhost:10000'
      }
    });
  }

  sock.on('close', function() {
    debug('Sock on IP: %s disconnected', sock.remoteAddress);
    that.peers.splice(that.peers.indexOf(sock), 1);
  });
};

Network.prototype.start = function(ns, cb) {
  var that = this;

  this.socket = airswarm(ns, function(sock) {
    that.handle(sock);
  });

  this.socket.on('listening', function() {
    console.log('%s peer listening', that.peer_name);
    return cb ? cb() : false;
  });
};

Network.prototype.getPeers = function() {
  return this.peers;
};
