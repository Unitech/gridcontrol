
var airswarm        = require('airswarm');
var fs              = require('fs');
var debug           = require('debug')('network');
var Moniker         = require('moniker');
var networkAddress  = require('network-address');
var defaults        = require('./constants.js');
var FilesManagement = require('./files/management.js');
var TaskManager     = require('./tasks/manager.js');
var API             = require('./api.js');
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');

/**
 * Main entry point of Intercom
 * @param {object} opts options
 * - opts.tmp_file       filemanager: default location of sync data
 * - opts.tmp_folder     filemanager: default location of folder uncomp
 * - opts.peer_api_port  api: start port for API (then task p+1++)
 * - opts.ns             (default pm2:fs)
 * - opts.is_file_master (default false)
 * - opts.peer_address   (default network ip)
 */
var Network = function(opts, cb) {
  if (typeof(opts) == 'function') {
    cb = opts;
    opts = {};
  }
  var that = this;

  EventEmitter.call(this);

  this._ns            = opts.ns || 'pm2:fs';
  this.is_file_master = opts.is_file_master || false;
  this.peer_name      = opts.peer_name || Moniker.choose();
  this.peer_address   = opts.peer_address || networkAddress();
  this.peer_api_port  = opts.peer_api_port || 10000;
  this.peers          = [];

  var tmp_file   = opts.tmp_file || defaults.TMP_FILE;
  var tmp_folder = opts.tmp_folder || defaults.TMP_FOLDER;

  this.file_manager = new FilesManagement({
    dest_file   : tmp_file,
    dest_folder : tmp_folder
  });

  this.task_manager = new TaskManager({
    port_offset : that.peer_api_port + 1
  });

  this.api = new API({
    port         : that.peer_api_port,
    task_manager : that.task_manager,
    file_manager : that.file_manager,
    net_manager  : this
  });

  // Start network discovery
  this.start(this._ns, function() {
    // Start API
    that.api.start(cb);
  });
};

Network.prototype.close = function(cb) {
  this.api.stop();
  this.file_manager.clear(cb);
};

Network.prototype.handle = function(sock) {
  var that = this;

  this.peers.push(sock);

  debug('status=new peer from=%s total=%d',
        this.peer_name,
        this.peers.length);

  sock.on('data', function(packet) {
    try {
      packet = JSON.parse(packet);
    } catch(e) {
      return console.error(e.message);
    }

    switch (packet.cmd) {
      // Task to synchronize this node
    case 'sync':
      console.log('Incoming sync req from ip=%s port=%s', packet.data.ip, packet.data.port);

      that.file_manager.synchronize(
        packet.data.ip,
        packet.data.port,
        function(err, meta) {
          // Synchronize Task meta (@todo env variable also?)
          that.task_manager.setTaskMeta(packet.data.meta);
          console.log('starting tasks!', meta.folder);
        });
      break;
    case 'clear':
      that.file_manager.clear();
      break;
    default:
      console.error('Unknow CMD', packet.cmd, packet.data);
    }
  });

  /**
   * When a new peer connect and req is received to master && is synced
   * tell the new peer to synchronize with the current peer
   */
  if (that.is_file_master == true && that.file_manager.has_file_to_sync) {
    that.askPeerToSync(sock);
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
    debug('status=listening name=%s ip=%s',
          that.peer_name,
          that.peer_address);
    return cb ? cb() : false;
  });
};

Network.prototype.getPeers = function() {
  return this.peers;
};

Network.prototype.askAllPeersToSync = function() {
  var that = this;

  this.peers.forEach(function(sock) {
    that.askPeerToSync(sock);
  });
};

Network.prototype.askPeerToSync = function(sock) {
  var that = this;

  Network.sendJson(sock, {
    cmd : 'sync',
    data : {
      ip   : that.peer_address,
      port : that.peer_api_port,
      meta : that.task_manager.getTaskMeta()
    }
  });
};

Network.sendJson = function(sock, data) {
  sock.write(JSON.stringify(data));
};

util.inherits(Network, EventEmitter);

module.exports = Network;
