var debug           = require('debug')('network');
var fs              = require('fs');
var path            = require('path');
var EventEmitter    = require('events').EventEmitter;
var Moniker         = require('moniker');
var publicIp        = require('public-ip');
var os              = require('os');
var chalk           = require('chalk');
var fmt             = require('fmt');
var pkg             = require('../package.json');
var defaults        = require('./constants.js');
var FilesManagement = require('./files/file_manager.js');
var TaskManager     = require('./tasks_manager/task_manager.js');
var Interplanetary  = require('./interplanetary/index.js');
var LoadBalancer    = require('./load-balancer.js');
var API             = require('./api.js');
var Wait            = require('./lib/wait.js');
var InternalIp      = require('./lib/internal-ip.js');

/**
 * Main entry point of GridControl
 * @constructor
 * @this {GridControl}
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
var GridControl = function(opts) {
  if (!(this instanceof GridControl))
    return new GridControl(opts);

  var that = this;

  // To save
  this.peer_name     = opts.peer_name || Moniker.choose();
  this.namespace     = process.env.NS || opts.namespace || 'pm2:fs';

  this.private_ip    = InternalIp.v4();
  this.peer_api_port = opts.peer_api_port  || 10000;

  this.tls = {
    key  : fs.readFileSync(path.join(__dirname, opts.private_key || '../misc/private.key')),
    cert : fs.readFileSync(path.join(__dirname, opts.public_key || '../misc/public.crt'))
  };

  /**
   * File manager initialization
   */
  var file_manager_opts = {
    dest_file   : defaults.TMP_FILE,
    dest_folder : defaults.TMP_FOLDER
  };

  if (opts.file_manager)
    file_manager_opts = opts.file_manager;

  this.file_manager = new FilesManagement(file_manager_opts);

  /**
   * Task manager initialization
   */
  var task_manager_opts = {
    port_offset : that.peer_api_port + 1
  };

  if (opts.task_manager && opts.task_manager.task_meta) {
    task_manager_opts.task_meta = opts.task_manager.task_meta;
  }

  this.task_manager = new TaskManager(task_manager_opts);

  /**
   * Load balancer initialization
   */
  this.load_balancer = new LoadBalancer({
    local_loop  : true
  });

  /**
   * API initialization
   */
  this.api = new API({
    load_balancer: that.load_balancer,
    task_manager : that.task_manager,
    file_manager : that.file_manager,
    net_manager  : this,
    port         : that.peer_api_port,
    tls          : that.tls
  });
};

GridControl.prototype.__proto__ = EventEmitter.prototype;

GridControl.prototype.serialize = function() {
  return {
    peer_name    : this.peer_name,
    namespace    : this.namespace,
    peer_api_port: this.peer_api_port,
    file_manager : this.file_manager.serialize(),
    task_manager : this.task_manager.serialize()
  };
};

GridControl.prototype.start = function(cb) {
  var that = this;

  Wait(this, [
    'ip:ready',
    'discovery:ready',
    'api:ready'
  ], function() {
    that.emit('ready');

    // Form
    fmt.title('Peer ready');
    fmt.field('Name', that.peer_name);
    fmt.field('Public IP', that.public_ip);
    fmt.field('Private IP', that.private_ip);
    fmt.field('API port', that.peer_api_port);
    fmt.field('Joined Namespace', that.namespace);
    fmt.field('Created at', new Date());
    fmt.sep();

    if (cb)
      return cb();
  });

  publicIp.v4().then(ip => {
    this.public_ip = ip;
    this.emit('ip:ready');

    this.startDiscovery(this.namespace, err => {
      if (err) console.error(err);
      this.emit('discovery:ready');
    });
  });


  that.api.start(err => {
    if (err) console.error(err);
    this.emit('api:ready');
  });
};

/**
 * Start network discovery
 * @param sock {object} socket object
 * @public
 */
GridControl.prototype.startDiscovery = function(ns, cb) {
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
GridControl.prototype.close = function(cb) {
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
GridControl.prototype.onNewPeer = function(sock, remoteId) {
  var that = this;

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
            packet.data.private_ip,
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
          console.error('Got an error while retrieving app pacakage to synchronize from %s',
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

        that.emit('files:synchronized', {
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
GridControl.prototype.getPeers = function() {
  return this.Interplanetary.getPeers();
};

/**
 * Send identity to target socket
 * @param sock {object} socket obj
 * @public
 */
GridControl.prototype.sendIdentity = function(sock) {
  var that = this;

  GridControl.sendJson(sock, {
    cmd : 'identity',
    data : that.getLocalIdentity()
  });
};

GridControl.prototype.getLocalIdentity = function() {
  var that = this;

  return {
    public_ip    : that.public_ip,
    private_ip   : that.private_ip,
    api_port     : that.peer_api_port,
    name         : that.peer_name,
    hostname     : os.hostname(),
    platform     : os.platform(),
    ns           : that.namespace,
    files_master : this.file_manager.isFileMaster(),
    user         : process.env.USER,
    grid_version : pkg.version,
    uptime       : process.uptime()
  };
};

GridControl.prototype.sendHealthStatus = function(sock) {
  // Send health stats at a regular interval (for LB intelligence)
};

GridControl.prototype.broadcast = function(cmd, data) {
  var that = this;

  this.Interplanetary.getPeers().forEach(function(sock) {
    GridControl.sendJson(sock, {
      cmd  : cmd,
      data : data
    });
  });
};

/**
 * Send command to all peers to synchronize
 * @public
 */
GridControl.prototype.askAllPeersToSync = function() {
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
GridControl.prototype.askPeerToSync = function(sock) {
  var that = this;

  GridControl.sendJson(sock, {
    cmd : 'sync',
    data : {
      ip   : that.private_ip,
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
GridControl.sendJson = function(sock, data) {
  try {
    sock.write(JSON.stringify(data));
  } catch(e) {
    console.log('Got error while writeing data %s to %s', data, sock.identity.name);
  }
};

module.exports = GridControl;
