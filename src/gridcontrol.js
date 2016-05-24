'use strict';
const debug           = require('debug')('gc:main');
const fs              = require('fs');
const path            = require('path');
const EventEmitter    = require('events').EventEmitter;
const Moniker         = require('moniker');
const publicIp        = require('public-ip');
const os              = require('os');
const chalk           = require('chalk');
const fmt             = require('fmt');
const pkg             = require('../package.json');
const defaults        = require('./constants.js');
const FilesManagement = require('./files/file_manager.js');
const TaskManager     = require('./tasks_manager/task_manager.js');

const Tools           = require('./lib/tools.js');
const LoadBalancer    = require('./load-balancer.js');
const API             = require('./api.js');
const Wait            = require('./lib/wait.js');

const Interplanetary  = require('./network/interplanetary.js');
const InternalIp      = require('./network/internal-ip.js');
const SocketPool      = require('./network/socket-pool.js');

const Hyperdrive      = require('hyperdrive')
const Level           = require('memdb')
const Archiver        = require('./archiver.js')

/**
 * Main entry point of GridControl
 * once object instancied, call .start()
 * @constructor
 * @this {GridControl}
 * @param opts                               {object} options
 * @param opts.peer_name                     {string} host name
 * @param opts.namespace                     {string} grid name for discovery
 * @param opts.peer_api_port                 {integer} API port (then task p+1++)
 * @param opts.file_manager                  {object} default location of sync data
 * @param opts.file_manager.dest_file        {string} default location of sync data
 * @param opts.file_manager.dest_folder      {string} default location of sync data
 * @param opts.file_manager.is_file_master   {string} default location of sync data
 * @param opts.file_manager.has_file_to_sync {string} default location of sync data
 * @param opts.file_manager.tmp_folder       {string} default location of folder uncomp
 * @param opts.task_manager                  {object} default location of sync data
 * @param opts.task_meta                     {object} default location of sync data
 * @param opts.task_meta.instances           {integer} default location of sync data
 * @param opts.task_meta.json_conf           {object} default location of sync data
 * @param opts.task_meta.task_folder         {string} default location of sync data
 * @param opts.task_meta.env                 {object} default location of sync data
 *
 * @fires GridControl#ready
 * @fires GridControl#ip:ready
 * @fires GridControl#discovery:ready
 * @fires GridControl#api:ready
 * @fires GridControl#files:synchronized
 * @fires GridControl#peer:synchronize
 * @fires GridControl#new:peer
 */
var GridControl = function(opts) {
  if (!(this instanceof GridControl))
    return new GridControl(opts);

  var that = this;

  this.peer_name        = opts.peer_name || Moniker.choose();
  this.namespace        = process.env.GRID || opts.namespace || defaults.GRID_NAME;
  this.private_ip       = InternalIp.v4();
  this.peer_api_port    = opts.peer_api_port  || 10000;
  this.processing_tasks = [];
  this.peer_list        = [];


  this.socket_pool      = new SocketPool();

  /**
   * File manager initialization
   */
  // var file_manager_opts = {
  //   dest_file   : defaults.TMP_FILE,
  //   dest_folder : defaults.TMP_FOLDER
  // };
  //
  // if (opts.file_manager)
  //   file_manager_opts = opts.file_manager;
  //
  // this.file_manager = new FilesManagement(file_manager_opts);

  let db = Level('./drive.db')
  this.drive = Hyperdrive(db)

  /**
   * Task manager initialization
   */
  var task_manager_opts = {
    port_offset : parseInt(that.peer_api_port) + 1
  };

  if (opts.task_manager && opts.task_manager.task_meta) {
    task_manager_opts.task_meta = opts.task_manager.task_meta;
  }

  this.task_manager = new TaskManager(task_manager_opts);

  /**
   * Load balancer initialization
   */
  this.load_balancer = new LoadBalancer();

  /**
   * Start Worker
   */
  this.startWorker();

  /**
   * API initialization
   */
  this.api = new API({
    load_balancer: that.load_balancer,
    task_manager : that.task_manager,
    // file_manager : that.file_manager,
    net_manager  : this,
    port         : that.peer_api_port
  });
};

GridControl.prototype.__proto__ = EventEmitter.prototype;

/**
 * Stop everything (api, discovery, socket pool, task manager, file manager)
 * @public
 * @TODO promise.all([]) + wait for clean close
 */
GridControl.prototype.close = function(cb) {
  debug(chalk.red('[SHUTDOWN]') + '[%s] Closing whole server', this.peer_name);
  this.api.close();
  this.Interplanetary.close();
  this.socket_pool.close();
  this.task_manager.terminate();
  // this.file_manager.clear(cb);
};

/**
 * Serialize whole Grid control for later restore
 * Just pass back this objet to Gridcontrol constructor to rebuild
 */
GridControl.prototype.serialize = function() {
  return {
    peer_name    : this.peer_name,
    namespace    : this.namespace,
    peer_api_port: this.peer_api_port,
    // file_manager : this.file_manager.serialize(),
    task_manager : this.task_manager.serialize()
  };
};

/**
 * Start Grid control
 */
GridControl.prototype.start = function() {

  return Promise.all([this.api.start(), publicIp.v4()])
  .then(values => {
    this.public_ip = values[1]
    this.emit('api:ready');
    this.emit('ip:ready');

    return this.startDiscovery(this.namespace)
  })
  .then(() => {
    this.emit('discovery:ready');
    this.emit('ready');

    if (process.env.NODE_ENV != 'test')
      Tools.writeConf(this.serialize());

    // Form
    fmt.title('Peer ready');
    fmt.field('Name', this.peer_name);
    fmt.field('Public IP', this.public_ip);
    fmt.field('Private IP', this.private_ip);
    fmt.field('Local API port', this.peer_api_port);
    fmt.field('Network port', this.network_port);
    fmt.field('Joined Namespace', this.namespace);
    fmt.field('Created at', new Date());
    fmt.sep();

    return Promise.resolve()
  })
};

/**
 * Start network discovery
 * @param ns {string} namespace for discovery
 * @public
 */
GridControl.prototype.startDiscovery = function(ns) {
  var that = this;

  this.namespace = ns;

  var key = new Buffer(this.namespace + defaults.GRID_NAME_SUFFIX);

  this.Interplanetary = Interplanetary({
    id: this.drive.id,
    dns : {
      server : defaults.DNS_SERVERS,
      interval : 1000
    },
    dht : false
  });

  this.Interplanetary.listen(0);
  this.Interplanetary.join(key.toString('hex'));

  this.Interplanetary.on('connection', this.onNewPeer.bind(this));

  this.archiver = new Archiver({
    drive: this.drive,
    interplanetary: this.Interplanetary,
    root: process.cwd()
  })

  return new Promise((resolve, reject) => {
    this.Interplanetary.on('error', (e) => {
      console.error('Interplanetary got error');
      console.error(e.message);
      reject(e);
    });

    this.Interplanetary.on('listening', () => {
      that.network_port = this.Interplanetary._tcp.address().port;
      resolve();
    });
  });
};

/**
 * Stop discovery
 * @param cb {callback
 * @public
 */
GridControl.prototype.stopDiscovery = function(cb) {
  return new Promise((resolve, reject) => {
    this.Interplanetary.once('close', () => resolve())
    this.Interplanetary.close();
  })
};

/**
 * Handle peer when connected
 * @param sock {object} socket object
 * @public
 */
GridControl.prototype.onNewPeer = function(sock, remoteId) {
  const router = this.socket_pool.add(sock);

  this.emit('new:peer', sock);

  router.send('identity', this.getLocalIdentity());

  /**
   * When a new peer connect and req is received to master && is synced
   * tell the new peer to synchronize with the current peer
   */
  // if (this.file_manager.isFileMaster() && this.file_manager.hasFileToSync()) {
    setTimeout(() => {
      this.askPeerToSync(router);
    }, 1500)
  // }

  router.on('clear', (data) => {
    // this.file_manager.clear();
  });

  router.on('trigger', (packet, cb) => {
    let task_id    = packet.task_id;
    let task_data  = packet.data;
    let task_opts  = packet.opts;

    debug('Received a trigger action: %s', task_id);

    this.task_manager.triggerTask({
      task_id  : task_id,
      task_data: task_data,
      task_opts: task_opts
    }).then(cb);
  });

  /**
   * Received by master once the peer has been synchronized
   */
  router.on('sync:done', (data) => {
    // if (data.synced_md5 == this.file_manager.getCurrentMD5()) {
    //   debug('Peer [%s] successfully synchronized with up-to-date sync file',
    //         router.identity.name);
    router.identity.synchronized = true;
    // }
  });

  /**
   * Task to synchronize this node
   */
  router.on('sync', (options, link) => {
    console.log('[%s] Incoming sync req from priv_ip=%s pub_ip=%s link %s',
                this.peer_name,
                data.private_ip,
                data.public_ip,
                link);

    archiver.download(link)
    .then(() => {
      this.socket_pool.broadcast('sync:done', {
        link: link
      });
    })
    // Write received file to destination file
    // this.file_manager.synchronize(data, file, (err, meta) => {
    //   if (err)
    //     return console.error('Error while synchronizing file', err);
    //
    //   // Set unpacked file path as base folder
    //   data.meta.base_folder = meta.dest_folder;
    //
    //   // Set task meta (env, task folder)
    //   this.task_manager.setTaskMeta(data.meta);
    //
    //   this.emit('files:synchronized', {
    //     file : this.file_manager.getFilePath()
    //   });
    //
    //   if (process.env.NODE_ENV == 'test') {
    //     // Do not try to start tasks on peers if test env
    //     return this.socket_pool.broadcast('sync:done', {
    //       synced_md5 : data.curr_md5
    //     });
    //   }
    //
    //   this.task_manager.initTaskGroup(data.meta)
    //   .then(() => {
    //     // Notify master that current peer
    //     // has sync with this MD5 (to be sure is synced on right
    //     // files project)
    //     this.socket_pool.broadcast('sync:done', {
    //       synced_md5 : data.curr_md5
    //     });
    //   });
    // });
  });
};

/**
 * Worker
 * - cache a peer_list for loadbalancer to apply round robin algo
 */
GridControl.prototype.startWorker = function() {
  var that = this;

  function cachePeerList() {
    that.peer_list     = [];

    that.peer_list.push({
      identity : {
        synchronized : that.task_manager.can_accept_queries
      },
      local        : true
    });

    // route only to local if test environment
    if (process.env.NODE_ENV != 'test')
      that.peer_list = that.peer_list.concat(that.socket_pool.getRouters());

    setTimeout(cachePeerList, 500);
  }

  cachePeerList();
};

GridControl.prototype.getPeerList = function() {
  return this.peer_list;
};

/**
 * Return peers connected
 * @public
 */
GridControl.prototype.getRouters = function() {
  return this.socket_pool.getRouters();
};

/**
 * Get local identity
 * @public
 */
GridControl.prototype.getLocalIdentity = function() {
  return {
    public_ip    : this.public_ip,
    private_ip   : this.private_ip,
    api_port     : this.peer_api_port,
    name         : this.peer_name,
    hostname     : os.hostname(),
    platform     : os.platform(),
    ns           : this.namespace,
    // files_master : this.file_manager.isFileMaster(),
    user         : process.env.USER,
    grid_version : pkg.version,
    uptime       : process.uptime()
  };
};

/**
 * Set all peers as NOT SYNCED
 * to avoid routing to peer with old app versions
 */
GridControl.prototype.setAllPeersAsNotSynced = function() {
  this.socket_pool.getRouters().forEach((router) => {
    router.identity.synchronized = false;
  });
};

/**
 * Set all peers as SYNCED
 * used in case the MD5 has not changed
 */
GridControl.prototype.setAllPeersAsSynced = function() {
  this.socket_pool.getRouters().forEach((router) => {
    router.identity.synchronized = true;
  });
};

/**
 * Send command to all peers to synchronize
 */
GridControl.prototype.askAllPeersToSync = function() {
  this.socket_pool.getRouters().forEach((router) => {
    router.identity.synchronized = false;
    this.askPeerToSync(router);
  });
};

/**
 * Send peer to synchronize
 * it sends the file buffer and meta on the same command
 * (see that.file_manager.current_file_buff argument)
 * @param router {object} router object
 */
GridControl.prototype.askPeerToSync = function(router) {
  this.emit('peer:synchronize');

  try {
    debug('Asking %s[%s] to sync', router.identity.public_ip, router.identity.name);
  } catch(e) {
    console.log('Critical, trying to route to unidentified socket');
    console.log(router)
    return;
  }

  this.archiver.archive('.')
  .then((archive) => {
    return this.archiver.spread(archive) 
  })
  .then((link) => {
    router.send('sync', {
      public_ip  : this.public_ip,
      private_ip : this.private_ip,
      meta       : this.task_manager.getTaskMeta(),
    }, link);
  })
};

module.exports = GridControl;
