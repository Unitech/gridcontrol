
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

var LoadBalancer    = require('./load-balancer.js');
var API             = require('./api.js');
var Wait            = require('./lib/wait.js');

var Interplanetary  = require('./network/interplanetary.js');
var InternalIp      = require('./network/internal-ip.js');
var SocketPool      = require('./network/socket-pool.js');

/**
 * TO UPDATE
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
  this.processing_tasks = [];

  this.tls = {
    key  : fs.readFileSync(path.join(__dirname, opts.private_key || '../misc/private.key')),
    cert : fs.readFileSync(path.join(__dirname, opts.public_key || '../misc/public.crt'))
  };

  this.SocketPool = new SocketPool();

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
    local_loop  : true,
    socket_pool : this.SocketPool
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

/**
 * Stop API + Network discovery + clear files
 * @public
 */
GridControl.prototype.close = function(cb) {
  debug(chalk.red('[SHUTDOWN]') + '[%s] Closing whole server', this.peer_name);
  this.api.close();
  this.Interplanetary.close();
  this.SocketPool.close();
  this.task_manager.terminate();
  this.file_manager.clear(cb);
};

/**
 * Serialize whole Grid control
 * for later restore
 */
GridControl.prototype.serialize = function() {
  return {
    peer_name    : this.peer_name,
    namespace    : this.namespace,
    peer_api_port: this.peer_api_port,
    file_manager : this.file_manager.serialize(),
    task_manager : this.task_manager.serialize()
  };
};

/**
 * Start Grid control
 */
GridControl.prototype.start = function(cb) {
  var that = this;

  // Wait for all event to be emitted
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
    fmt.field('Local API port', that.peer_api_port);
    fmt.field('Network port', that.network_port);
    fmt.field('DSS port', defaults.DSS_FS_PORT);
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

  this.namespace = ns;

  this.Interplanetary = Interplanetary({
    tls        : that.tls
  });

  this.Interplanetary.listen(0);
  this.Interplanetary.join(ns);

  this.Interplanetary.on('error', function(e) {
    console.error('Interplanetary got error');
    console.error(e.message);
    return cb(e);
  });

  this.Interplanetary.on('listening', function() {
    that.network_port = that.Interplanetary._tcp.address().port;
    return cb ? cb() : false;
  });

  this.Interplanetary.on('connection', this.onNewPeer.bind(this));
};

GridControl.prototype.stopDiscovery = function(cb) {
  this.Interplanetary.close();
};

/**
 * Handle peer when connected
 * @param sock {object} socket object
 * @public
 */
GridControl.prototype.onNewPeer = function(sock, remoteId) {
  var that   = this;
  var router = this.SocketPool.add(sock);

  router.send('identity', that.getLocalIdentity());

  /**
   * When a new peer connect and req is received to master && is synced
   * tell the new peer to synchronize with the current peer
   */
  if (that.file_manager.isFileMaster() &&
      that.file_manager.hasFileToSync()) {
    setTimeout(function() {
      that.askPeerToSync(router);
    }, 1500);
  }

  router.on('identity', function(data) {
    debug('status=identity meta info from=%s[%s] on=%s',
          data.name,
          data.private_ip,
          that.peer_name);
    router.identity = data;
    // Set peer flag as not synchronized
    router.identity.synchronized = false;
  });

  router.on('clear', function(data) {
    that.file_manager.clear();
  });

  router.on('trigger', function(packet, cb) {
    var task_id    = packet.task_id;
    var task_data  = packet.data;
    var task_opts  = packet.opts;

    if (process.env.NODE_ENV == 'test')
      return cb();

    that.task_manager.triggerTask({
      task_id  : task_id,
      task_data: task_data,
      task_opts: task_opts
    }, function(err, res) {
      return cb(err, res);
    });
  });

  /**
   * Received by master once the peer has been synchronized
   */
  router.on('sync:done', function(data) {
    if (data.synced_md5 == that.file_manager.getCurrentMD5()) {
      debug('Peer [%s] successfully synchronized with up-to-date sync file',
            router.identity.name);
      router.identity.synchronized = true;
    }
  });

  /**
   * Task to synchronize this node
   */
  router.on('sync', function(data, file) {
    console.log('[%s] Incoming sync req from priv_ip=%s pub_ip=%s for MD5 [%s]',
                that.peer_name,
                data.private_ip,
                data.public_ip,
                data.curr_md5);

    // Write received file to destination file
    that.file_manager.synchronize(data, file, function(err, meta) {
      if (err)
        return console.error('Error while synchronizing file', err);

      // Set unpacked file path as base folder
      data.meta.base_folder = meta.dest_folder;

      // Set task meta (env, task folder)
      that.task_manager.setTaskMeta(data.meta);

      that.emit('files:synchronized', {
        file : that.file_manager.getFilePath()
      });

      if (process.env.NODE_ENV == 'test') {
        return that.SocketPool.broadcast('sync:done', {
          synced_md5 : data.curr_md5
        });
      }

      that.task_manager.initTaskGroup(data.meta, function() {
        // Notify master that current peer
        // has sync with this MD5 (to be sure is synced on right
        // files project)
        that.SocketPool.broadcast('sync:done', {
          synced_md5 : data.curr_md5
        });
      });
    });
  });
};

/**
 * Return peers connected
 * @public
 */
GridControl.prototype.getSockets = function() {
  return this.SocketPool.getSockets();
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

/**
 * Send command to all peers to synchronize
 * @public
 */
GridControl.prototype.askAllPeersToSync = function() {
  var that = this;

  this.getSockets().forEach(function(socket) {
    socket.identity.synchronized = false;
    that.askPeerToSync(socket);
  });
};

/**
 * Send synchronize command to target sock
 * @param sock {object} socket obj
 * @public
 */
GridControl.prototype.askPeerToSync = function(socket) {
  var that = this;

  socket.send('sync', {
    public_ip  : that.public_ip,
    private_ip : that.private_ip,
    meta       : that.task_manager.getTaskMeta(),
    curr_md5   : that.file_manager.getCurrentMD5()
  }, that.file_manager.current_file_buff);
};

GridControl.sendJson = function(sock, data) {
  try {
    sock.write(JSON.stringify(data));
  } catch(e) {
    console.log('Got error while writeing data %s to %s', data, sock.identity.name);
  }
};

module.exports = GridControl;
