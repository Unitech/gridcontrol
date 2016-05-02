var fs              = require('fs');
var path            = require('path');
var EventEmitter    = require('events').EventEmitter;
var Moniker         = require('moniker');
var debug           = require('debug')('network');
var networkAddress  = require('network-address');
var os              = require('os');
var chalk           = require('chalk');
var fmt             = require('fmt');
var defaults        = require('./constants.js');
var FilesManagement = require('./files/file_manager.js');
var TaskManager     = require('./tasks_manager/task_manager.js');
var Interplanetary  = require('./interplanetary/index.js');
var LoadBalancer    = require('./load-balancer.js');
var API             = require('./api.js');
var stringify       = require('./safeclonedeep.js');

/**
 * Main entry point of NetFunctions
 * @constructor
 * @this {NetFunctions}
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
var NetFunctions = function(opts, cb) {
  if (!(this instanceof NetFunctions))
    return new NetFunctions(opts, cb);

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

  this.load_balancer = new LoadBalancer({
    local_loop  : true
  });

  this.api = new API({
    load_balancer: that.load_balancer,
    task_manager : that.task_manager,
    file_manager : that.file_manager,
    net_manager  : this,
    port         : that.peer_api_port,
    tls          : that.tls
  });

  // Start network discovery
  this.startDiscovery(this._ns, function() {
    // Start API
    that.api.start(cb);
  });
};

NetFunctions.prototype.__proto__ = EventEmitter.prototype;

/**
 * Start network discovery
 * @param sock {object} socket object
 * @public
 */
NetFunctions.prototype.startDiscovery = function(ns, cb) {
  var that = this;

  this.Interplanetary = Interplanetary({
    tls        : that.tls
  });

  this.Interplanetary.listen(0);
  this.Interplanetary.join(ns);

  this.Interplanetary.on('error', function(e) {
    console.error('Interplanetary got error');
    console.error(e.message);
  });

  this.Interplanetary.on('listening', function() {

    // Form
    fmt.title('Peer ready');
    fmt.field('Name', that.peer_name);
    fmt.field('Local address', that.peer_address);
    fmt.field('API port', that.peer_api_port);
    fmt.field('Joined Namespace', that._ns);
    fmt.field('Created at', new Date());
    fmt.sep();

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
NetFunctions.prototype.close = function(cb) {
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
NetFunctions.prototype.onNewPeer = function(sock, remoteId) {
  var that = this;

  var remote_id = remoteId.toString('hex');

  sock.on('close', function() {
    debug('Connection closed on server %s', that.peer_name);
  });

  sock.on('error', function(e) {
    console.error('[%s] Peer Socket error on peer', that.peer_name);
    console.error(e.message);
  });

  sock.on('data', function(packet) {
    try {
      packet = JSON.parse(packet.toString());
    } catch(e) {
      console.log('Unparsable data has been received');
      return false;
    }

    switch (packet.cmd) {

    case 'identity':
      /**
       * Receive meta information about peer
       */
      debug('status=handshake meta info from=%s[%s] on=%s',
            packet.data.name,
            packet.data.ip,
            that.peer_name);
      sock.identity = packet.data;
      // Set peer flag as not synchronized
      sock.identity.synchronized = false;
      break;

    case 'sync:done':
      /**
       * Received by master once the peer has been synchronized
       */
      if (packet.data.synced_md5 == that.file_manager.getCurrentMD5()) {
        debug('Peer [%s] successfully synchronized with up-to-date sync file',
              sock.identity.name);
        sock.identity.synchronized = true;
      }
      break;

    case 'sync':
      /**
       * Task to synchronize this node
       */
      console.log('[%s] Incoming sync req from ip=%s port=%s for MD5 [%s]',
                  that.peer_name,
                  packet.data.ip,
                  packet.data.port,
                  packet.data.curr_md5);

      that.file_manager.synchronize(packet.data.ip, packet.data.port, function(err, meta) {
        if (err) {
          console.error('Got an error while retrieving app to synchronize from %s',
                        packet.data.ip);
          return console.error(err);
        };
        packet.data.meta.base_folder = that.file_manager.getFilePath();
        that.task_manager.setTaskMeta(packet.data.meta);

        if (that.file_manager.getDestFileMD5(that.file_manager.dest_file) !=
            packet.data.curr_md5) {
          console.error('=========== Wrong MD5 ===========');
          //@todo launch retry retrieve
          return false;
        }

        /****************************************/
        /****** TASK START ON SLAVE NODE ********/

        that.emit('synchronized', {
          ip : packet.data.ip,
          file : that.file_manager.getFilePath(),
          meta : packet.data.meta
        });

        if (process.env.NODE_ENV == 'test') {
          debug(chalk.blue.bold('[SYNC]') + ' File synchronized on %s', that.peer_name);

          that.broadcast('sync:done', {
            synced_md5 : packet.data.curr_md5
          });
          return false;
        }

        that.task_manager.initTaskGroup(packet.data.meta, function() {
          that.broadcast('sync:done', {
            synced_md5 : packet.data.curr_md5
          });
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
    }, 1500);
  }
};

/**
 * Return peers connected
 * @public
 */
NetFunctions.prototype.getPeers = function() {
  return this.Interplanetary.getPeers();
};

/**
 * Send identity to target socket
 * @param sock {object} socket obj
 * @public
 */
NetFunctions.prototype.sendIdentity = function(sock) {
  var that = this;

  NetFunctions.sendJson(sock, {
    cmd : 'identity',
    data : {
      ip       : that.peer_address,
      api_port : that.peer_api_port,
      name     : that.peer_name,
      hostname : os.hostname(),
      platform : os.platform(),
      ns       : that._ns,
      user     : process.env.USER || null
    }
  });
};

NetFunctions.prototype.getLocalIdentity = function() {
  var that = this;

  return {
    ip           : 'localhost',
    api_port     : that.peer_api_port,
    name         : that.peer_name,
    hostname     : os.hostname(),
    platform     : os.platform(),
    ns           : that._ns,
    synchronized : true,
    files_master : this.file_manager.isFileMaster(),
    user         : process.env.USER
  };
};

NetFunctions.prototype.sendHealthStatus = function(sock) {
  // Send health stats at a regular interval (for LB intelligence)
};

NetFunctions.prototype.broadcast = function(cmd, data) {
  var that = this;

  this.Interplanetary.getPeers().forEach(function(sock) {
    NetFunctions.sendJson(sock, {
      cmd  : cmd,
      data : data
    });
  });
};

/**
 * Send command to all peers to synchronize
 * @public
 */
NetFunctions.prototype.askAllPeersToSync = function() {
  var that = this;

  // @todo: check if different md5 than previous deployment
  this.Interplanetary.getPeers().forEach(function(sock) {
    sock.identity.synchronized = false;
    that.askPeerToSync(sock);
  });
};

/**
 * Send synchronize command to target sock
 * @param sock {object} socket obj
 * @public
 */
NetFunctions.prototype.askPeerToSync = function(sock) {
  var that = this;

  NetFunctions.sendJson(sock, {
    cmd : 'sync',
    data : {
      ip   : that.peer_address,
      port : that.peer_api_port,
      meta : that.task_manager.getTaskMeta(),
      curr_md5 : that.file_manager.getCurrentMD5()
    }
  });
};

/**
 * Transform JSON data to string and write to socket
 * @param sock {object} socket obj
 * @param data {object} json object
 * @static sendJSON
 */
NetFunctions.sendJson = function(sock, data) {
  try {
    sock.write(JSON.stringify(data));
  } catch(e) {
    console.log('Got error while writeing data %s to %s', data, sock.identity.name);
  }
};

module.exports = NetFunctions;
