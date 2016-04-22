
var airswarm        = require('airswarm');
var fs              = require('fs');
var debug           = require('debug')('network');
var Moniker         = require('moniker');
var networkAddress  = require('network-address');
var defaults        = require('./constants.js');
var FilesManagement = require('./files/file_manager.js');
var TaskManager     = require('./tasks_manager/task_manager.js');
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
var Intercom = function(opts, cb) {
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
    dest_file      : tmp_file,
    dest_folder    : tmp_folder,
    is_file_master : that.is_file_master
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

Intercom.prototype.close = function(cb) {
  this.api.stop();
  this.file_manager.clear(cb);
};

Intercom.prototype.onNewPeer = function(sock) {
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
          that.task_manager.setTaskMeta(packet.data.meta);
          /****************************************/
          /****** TASK START ON SLAVE NODE ********/
          console.log('starting tasks!', meta.folder);
          /****************************************/
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
  if (that.file_manager.isFileMaster() && that.file_manager.hasFileToSync()) {
    that.askPeerToSync(sock);
  }

  sock.on('close', function() {
    debug('Sock on IP: %s disconnected', sock.remoteAddress);
    that.peers.splice(that.peers.indexOf(sock), 1);
  });
};

Intercom.prototype.start = function(ns, cb) {
  var that = this;

  this.socket = airswarm(ns, this.onNewPeer.bind(this));

  this.socket.on('error', function(e) {
    console.error(e.message);
  });

  this.socket.on('listening', function() {
    debug('status=listening name=%s ip=%s',
          that.peer_name,
          that.peer_address);
    return cb ? cb() : false;
  });
};

Intercom.prototype.getPeers = function() {
  return this.peers;
};

Intercom.prototype.askAllPeersToSync = function() {
  var that = this;

  this.peers.forEach(function(sock) {
    that.askPeerToSync(sock);
  });
};

Intercom.prototype.askPeerToSync = function(sock) {
  var that = this;

  Intercom.sendJson(sock, {
    cmd : 'sync',
    data : {
      ip   : that.peer_address,
      port : that.peer_api_port,
      meta : that.task_manager.getTaskMeta()
    }
  });
};

Intercom.sendJson = function(sock, data) {
  sock.write(JSON.stringify(data));
};

util.inherits(Intercom, EventEmitter);

module.exports = Intercom;
