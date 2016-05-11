var request = require('request');
var crypto  = require('crypto');
var debug   = require('debug')('lb');

/**
 * Load balancer
 * @constructor
 * @param opts {object} options
 * @param opts.task_manager {object} task manager object
 * @param opts.net_manager {object} net manager object
 * @param opts.local_loop {boolean} should the LB proxy query to local?
 */
var LoadBalancer = function(opts) {
  this.local_loop       = opts.local_loop || true;

  this.processing_tasks = {};
  this.peer_list        = [];
  this.socket_pool      = opts.socket_pool;
  // Round robin index
  this._rri = 0;

  var that = this;

  (function suitablePeer() {
    //@todo take monitoring data into account
    that.peer_list     = [];

    that.peer_list.push({
      identity : {
        synchronized : true
      },
      local        : true
    });

    if (!process.env.ONLY_LOCAL)
      that.peer_list = that.peer_list.concat(that.socket_pool.getSockets());
    setTimeout(suitablePeer, 500);
  })();
};

LoadBalancer.prototype.findSuitablePeer = function(req, cb) {
  var that  = this;
  var retry = 0;

  (function rec() {
    if (retry++ > 15)
      console.error('Trying too many time to route request!');

    var target = that.peer_list[that._rri++ % that.peer_list.length];

    if (target.identity.synchronized == false)
      return setTimeout(rec, 100);
    return cb(null, target);
  })();
};

LoadBalancer.prototype.route = function(req, res, next) {
  var that      = this;
  var task_id   = req.body.task_id;
  var task_data = req.body.data;
  var task_opts = req.body.opts || {};
  var uuid      = crypto.randomBytes(32).toString('hex');

  // Avoid integer overflow
  if (Number.isSafeInteger(that._rri) === false)
    that._rri = 0;

  this.findSuitablePeer(req, function(err, peer) {

    // @todo: do stats on task processing (invokation, errors...)
    // + Log running tasks for smarter load balancing in the future
    // + link with HealthCheck regular data to know load
    // if (!that.stats_tasks[task_id])
    //
    that.processing_tasks[uuid] = {
      started_at : new Date(),
      peer_info  : peer.identity,
      task_id    : task_id
    };

    if (peer.local) {
      debug('Routing task %s to localhost', task_id);
      req.task_manager.triggerTask({
        task_id  : task_id,
        task_data: task_data,
        task_opts: task_opts
      }, function(err, data) {
        delete that.processing_tasks[uuid];
        if (err) {
          if (!data) data = {};
          data.err = err;
        }
        data.server = req.net_manager.getLocalIdentity();
        res.send(data);
      });

      return false;
    }

    console.log('Routing tasks %s to %s:%s',
                task_id,
                peer.identity.private_ip,
                peer.identity.api_port);

    peer.send('trigger', {
      task_id : task_id,
      data    : task_data,
      opts    : task_opts
    }, function(err, data) {
      delete that.processing_tasks[uuid];
      if (err) {
        if (!data) data = {};
        data.err = err;
      }
      if (!data) data = {};
      data.server = peer.identity;
      res.send(data);
    });

    return false;
  });
};

LoadBalancer.prototype.broadcast = function(req, res, next) {
};

module.exports = LoadBalancer;
