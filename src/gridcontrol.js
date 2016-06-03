'use strict';
const debug           = require('debug')('gc:main');
const fs              = require('fs');
const path            = require('path');
const EventEmitter    = require('events').EventEmitter;
const Moniker         = require('moniker');
const os              = require('os');
const chalk           = require('chalk');
const fmt             = require('fmt');

const pkg             = require('../package.json');
const defaults        = require('./constants.js');
const FilesManagement = require('./file_manager/file_manager.js');
const TaskManager     = require('./tasks_manager/task_manager.js');

const Tools           = require('./lib/tools.js');
const LoadBalancer    = require('./load-balancer.js');
const API             = require('./api.js');

const PublicIp        = require('./lib/public-ip.js');
const InternalIp      = require('./lib/internal-ip.js');
const Interplanetary  = require('./network/interplanetary.js');
const SocketPool      = require('./network/socket-pool.js');

/**
 * Main entry point of GridControl
 * once object instancied, call .start()
 * @constructor
 * @this {GridControl}
 * @param {object}  opts                              options
 * @param {string}  opts.peer_name
 * @param {string}  opts.namespace                    grid name for discovery
 * @param {integer} opts.password                     grid password
 * @param {integer} opts.peer_api_port                API port (then task p+1++)
 * @param {object}  opts.file_manager                 file manager options
 * @param {string}  opts.file_manager.app_folder
 * @param {string}  opts.file_manager.root_folder
 * @param {string}  opts.file_manager.is_file_master
 * @param {object}  opts.task_manager
 * @param {object}  opts.task_meta
 * @param {integer} opts.task_meta.instances
 * @param {object}  opts.task_meta.json_conf
 * @param {string}  opts.task_meta.task_folder
 * @param {object}  opts.task_meta.env
 *
 * @fires GridControl#ready                  when this peer is ready
 * @fires GridControl#synchronized           when this peer is synchronized
 * @fires GridControl#peer:synchronize       when this peer send synchronize cmd
 * @fires GridControl#peer:confirmed         when peer is authenticated
 * @fires GridControl#new:peer               when new potencial peer is detected
 */
var GridControl = function(opts) {
  if (!(this instanceof GridControl))
    return new GridControl(opts);

  var that = this;

  this.peer_name        = opts.peer_name        || Moniker.choose();
  this.namespace        = process.env.GRID      || opts.namespace || defaults.GRID_NAME;
  this.password         = process.env.GRID_AUTH || opts.password || null;
  this.peer_api_port    = opts.peer_api_port    || 10000;
  this.private_ip       = InternalIp.v4();
  this.processing_tasks = [];
  this.peer_list        = [];

  this.socket_pool      = new SocketPool();

  /**
   * File manager initialization
   */

  if (!opts.file_manager)
    opts.file_manager = {};

  this.file_manager = new FilesManagement({
    root_folder    : opts.file_manager.root_folder,
    app_folder     : opts.file_manager.app_folder
  });

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
    file_manager : that.file_manager,
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
  debug(chalk.red('[SHUTDOWN]') + '[%s] Terminating local peer', this.peer_name);
  this.api.close();
  if (this.command_swarm) this.command_swarm.close();
  this.socket_pool.close();
  this.task_manager.terminate();
  this.file_manager.clear();
  process.nextTick(cb);
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
    task_manager : this.task_manager.serialize()
  };
};

/**
 * Start Grid control
 */
GridControl.prototype.start = function() {

  return Promise.all([this.api.start(), PublicIp(), this.task_manager.start()])
    .then(values => {
      this.public_ip = values[1][0]

      return this.startDiscovery(this.namespace)
    })
    .then(() => {
      this.emit('ready');

      if (process.env.NODE_ENV != 'test')
        Tools.writeConf(this.serialize());

      // Form
      fmt.title('Peer ready');
      fmt.field('Linked to Grid name', this.namespace);
      fmt.field('Password secured', this.password ? chalk.green('Yes') : chalk.red('No'));
      fmt.field('Name', this.peer_name);
      fmt.field('Public IP', this.public_ip);
      fmt.field('Private IP', this.private_ip);
      fmt.field('Local API port', this.peer_api_port);
      fmt.field('Network port', this.network_port);
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

  this.command_swarm = Interplanetary({
    dns : {
      server : defaults.DNS_DISCOVERY,
      interval : 1000
    },
    dht : false
  });

  this.command_swarm.listen(0);
  this.command_swarm.join(key.toString('hex'));

  /**
   * Action when a new socket connection has been established
   */
  this.command_swarm.on('connection', (socket) => {
    this.emit('new:peer', socket);
    /**
     * Exchange ciphering keys, authenticate and identify Peer
     */
    this.socket_pool
      .add({
        socket         : socket,
        local_identity : this.getLocalIdentity(),
        password       : this.password
      })
      .then(router => {
        this.emit('confirmed:peer');
        this.mountActions(router);
      })
      .catch(e => {
        this.emit('rejected', e);
        console.error(e.message || e);
        socket.destroy();
      });
  });

  return new Promise((resolve, reject) => {
    this.command_swarm.on('error', (e) => {
      console.error('command_swarm got error');
      console.error(e.message);
      reject(e);
    });

    this.command_swarm.on('listening', () => {
      let port = this.command_swarm._tcp.address().port;
      debug('Command swarm listening on port %d', port);
      that.network_port = port;
      resolve();
    });
  });
};

/**
 * Handle peer when connected
 * @param sock {object} socket object
 * @public
 */
GridControl.prototype.mountActions = function(router) {

  // When new peer connects, master share the link for data
  if (this.file_manager.isFileMaster)
    this.askPeerToSync(router);

  router.on('trigger', (msg, cb) => {
    debug('Received a trigger action: %s', msg.task_id);

    this.task_manager.triggerTask({
      task_id  : msg.task_id,
      task_data: msg.task_data,
      task_opts: msg.task_opts
    }).then(cb);
  });

  /**
   * Received by master once the peer has been synchronized
   */
  router.on('sync:done', (data) => {
    // if data.link == current_link == OK
    router.identity.synchronized = true;
  });

  /**
   * Task to synchronize this current node
   */
  router.on('sync', (sync_meta) => {
    console.log('[%s] Incoming sync req from priv_ip=%s pub_ip=%s link %s',
                this.peer_name,
                sync_meta.private_ip,
                sync_meta.public_ip,
                sync_meta.link);

    this.file_manager.downloadAndExpand(sync_meta.link)
      .then(() => {
        this.emit('synchronized');

        /**
         * If tests, do not launch Tasks
         */
        if (process.env.NODE_ENV == 'test') {
          return this.socket_pool.broadcast('sync:done', {
            link : sync_meta.link
          });
        }

        this.task_manager.initTasks(sync_meta.meta)
          .then(() => {
            this.socket_pool.broadcast('sync:done', {
              link : sync_meta.link
            });
          });
      })
      .catch(e => {
        console.log('synchro ERROR', e.stack);
        this.socket_pool.broadcast('sync:error', {
          error : e
        });
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
    this.command_swarm.once('close', () => resolve())
    this.command_swarm.close();
  })
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
  setTimeout(() => {
    this.socket_pool.getRouters().forEach((router) => {
      this.askPeerToSync(router);
    });
  }, 1000);
};

GridControl.prototype.askPeerToSync = function(router) {
  this.emit('peer:synchronize');

  if (!router.identity) {
    return console.error('Identity is not attached to router?');
  }

  debug('Asking %s[%s] to sync',
        router.identity.public_ip,
        router.identity.name);

  router.send('sync', {
    public_ip  : this.public_ip,
    private_ip : this.private_ip,
    meta       : this.task_manager.getTaskMeta(),
    link       : this.file_manager.currentLink
  });
};

module.exports = GridControl;
