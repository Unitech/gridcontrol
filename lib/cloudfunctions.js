var fs              = require('fs');
var path            = require('path');
var EventEmitter    = require('events').EventEmitter;
var Moniker         = require('moniker');
var debug           = require('debug')('network');
var networkAddress  = require('network-address');
var os              = require('os');
var chalk           = require('chalk');

var defaults        = require('./constants.js');
var FilesManagement = require('./files/file_manager.js');
var TaskManager     = require('./tasks_manager/task_manager.js');
var Interplanetary  = require('./../subprojects/interplanetary/index.js');
var API             = require('./api.js');
var stringify       = require('./safeclonedeep.js');

/**
 * Main entry point of CloudFunction
 * @constructor
 * @this {CloudFunction}
 * @param opts                {object} options
 * @param opts.tmp_file       {string} default location of sync data
 * @param opts.tmp_folder     {string} default location of folder uncomp
 * @param opts.peer_api_port  {integer} API port (then task p+1++)
 * @param opts.ns             {string} (default pm2:fs)
 * @param opts.is_file_master {boolean} (default false)
 * @param opts.peer_address   {string}  (default network ip)
 * @param opts.private_key    {string} Private key passed to TCP and HTTP
 * @param opts.public_key     {string} Public key passed to TCP and HTTP
 * @param cb                  {function} callback
 */
var CloudFunction = function(opts, cb) {
  if (!(this instanceof CloudFunction))
    return new CloudFunction(opts, cb);

  if (typeof(opts) == 'function') {
    cb = opts;
    opts = {};
  }

  var that = this;

  this._ns            = process.env.NS || opts.ns || 'pm2:fs';
  this.is_file_master = opts.is_file_master || false;
  this.peer_name      = opts.peer_name      || Moniker.choose();
  this.peer_address   = opts.peer_address   || networkAddress();
  this.peer_api_port  = opts.peer_api_port  || 10000;
  //this.peers          = {};

  this.tls = {
    key  : fs.readFileSync(path.join(__dirname, opts.private_key || '../misc/private.key')),
    cert : fs.readFileSync(path.join(__dirname, opts.public_key || '../misc/public.crt'))
  };

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
    net_manager  : this,
    tls         : that.tls
  });

  // Start network discovery
  this.startDiscovery(this._ns, function() {
    // Start API
    that.api.start(cb);
  });
};

CloudFunction.prototype.__proto__ = EventEmitter.prototype;

/**
 * Start network discovery
 * @param sock {object} socket object
 * @public
 */
CloudFunction.prototype.startDiscovery = function(ns, cb) {
  var that = this;

  this.Interplanetary = Interplanetary({
    dht : false,
    tls        : that.tls
  });

  this.Interplanetary.listen(0);
  this.Interplanetary.join(ns);

  this.Interplanetary.on('error', function(e) {
    console.error('Interplanetary got error');
    console.error(e.message);
  });

  this.Interplanetary.on('listening', function() {
    debug('status=listening name=%s ip=%s',
          that.peer_name,
          that.peer_address);
    return cb ? cb() : false;
  });

  // this.Interplanetary.on('connecting', function() {
  //   debug('status=connecting');
  // });

  this.Interplanetary.on('connection', this.onNewPeer.bind(this));
};

/**
 * Stop API + Network discovery + clear files
 * @public
 */
CloudFunction.prototype.close = function(cb) {
  debug(chalk.red('[SHUTDOWN]') + '[%s] Closing whole server', this.peer_name);
  this.api.stop();
  this.Interplanetary.close();
  this.file_manager.clear(cb);
};

/**
 * Handle peer when connected
 * @param sock {object} socket object
 * @public
 */
CloudFunction.prototype.onNewPeer = function(sock, remoteId) {
  var that = this;

  var remote_id = remoteId.toString('hex');

  sock.on('close', function() {
    debug('Connection from %s to %s closed',
          that.peer_name,
          sock.identity.name);
  });

  sock.on('error', function(e) {
    console.error('[%s] Peer Socket error on peer [%s]',
                  that.peer_name,
                  sock.identity.name);
    console.error(e);
  });

  debug('status=new peer from=%s total=%d',
        this.peer_name,
        this.Interplanetary.getPeers().length);

  sock.on('data', function(packet) {
    try {
      packet = JSON.parse(packet.toString());
    } catch(e) {
      console.log(packet.toString());
      return console.error(e.message);
    }

    switch (packet.cmd) {
    case 'identity':
      // Receive meta information about peer
      debug('status=handshake meta info from=%s on=%s',
            packet.data.name,
            that.peer_name);
      sock.identity = packet.data;
      break;
      /**
       * Slave command zone
       */
    case 'sync':
      // Task to synchronize this node
      console.log('[%s] Incoming sync req from ip=%s port=%s', that.peer_name, packet.data.ip, packet.data.port);

      that.file_manager.synchronize(
        packet.data.ip,
        packet.data.port,
        function(err, meta) {
          packet.data.meta.base_folder = that.file_manager.getFilePath();
          that.task_manager.setTaskMeta(packet.data.meta);

          /****************************************/
          /****** TASK START ON SLAVE NODE ********/

          if (process.env.NODE_ENV == 'test') {
            debug(chalk.blue.bold('[SYNC]') + ' File synchronized on %s', that.peer_name);
            return false;
          }

          that.task_manager.initTaskGroup(packet.data.meta, function() {
            console.log('Files started!');
          });
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
   * Send current peer identity
   */
  that.sendIdentity(sock);

  /**
   * When a new peer connect and req is received to master && is synced
   * tell the new peer to synchronize with the current peer
   */
  if (that.file_manager.isFileMaster() &&
      that.file_manager.hasFileToSync()) {
    setTimeout(function() {
      that.askPeerToSync(sock);
    }, 300);
  }
};

/**
 * Return peers connected
 * @public
 */
CloudFunction.prototype.getPeers = function() {
  return this.Interplanetary.getPeers();
};

/**
 * Send identity to target socket
 * @param sock {object} socket obj
 * @public
 */
CloudFunction.prototype.sendIdentity = function(sock) {
  var that = this;

  CloudFunction.sendJson(sock, {
    cmd : 'identity',
    data : {
      ip       : that.peer_address,
      api_port : that.peer_api_port,
      name     : that.peer_name,
      hostname : os.hostname(),
      platform : os.platform()
    }
  });
};

CloudFunction.prototype.sendHealthStatus = function(sock) {
  // Send health stats at a regular interval (for LB intelligence)
};

/**
 * Send command to all peers to synchronize
 * @public
 */
CloudFunction.prototype.askAllPeersToSync = function() {
  var that = this;

  this.Interplanetary.getPeers().forEach(function(sock) {
    that.askPeerToSync(sock);
  });
};

/**
 * Send synchronize command to target sock
 * @param sock {object} socket obj
 * @public
 */
CloudFunction.prototype.askPeerToSync = function(sock) {
  var that = this;

  CloudFunction.sendJson(sock, {
    cmd : 'sync',
    data : {
      ip   : that.peer_address,
      port : that.peer_api_port,
      meta : that.task_manager.getTaskMeta()
    }
  });
};

/**
 * Transform JSON data to string and write to socket
 * @param sock {object} socket obj
 * @param data {object} json object
 * @static sendJSON
 */
CloudFunction.sendJson = function(sock, data) {
  sock.write(JSON.stringify(data));
};

module.exports = CloudFunction;
