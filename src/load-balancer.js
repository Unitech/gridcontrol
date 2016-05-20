var request = require('request');
var crypto  = require('crypto');
var debug   = require('debug')('lb');

/**
 * Load balancer
 * @constructor
 */
var LoadBalancer = function(opts) {
  this.processing_tasks = {};
  this._rri             = 0;
};

/**
 * Method to find suitable peer
 * for now it only checks if peer is SYNCHRONIZED
 * @param req {object} Express req object
 * @param cb {function} Callback triggered once LB found peer
 */
LoadBalancer.prototype.findSuitablePeer = function(req, cb) {
  var that  = this;
  var retry = 0;

  (function rec() {
    if (retry++ > 100)
      console.error('Trying too many time to route request!');

    var peer_list = req.net_manager.getPeerList();

    var target = peer_list[that._rri++ % peer_list.length];

    //@todo take monitoring data into account
    if (target.identity.synchronized == false)
      return setTimeout(rec, 100);
    return cb(null, target);
  })();
};

/**
 * Main function to route a one-to-one action
 * exposed on api.js as:
 * http://127.0.0.1:10000/tasks/lb_trigger_single
 *
 * @param req.body.task_id = task id (script.handler)
 * @param req.body.data    = data to be passed to the task
 * @param req.body.opts    = extra options like 'timeout'
 */
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

    // @todo: do stats on task processing (invokation, errors, exec time...)
    that.processing_tasks[uuid] = {
      started_at : new Date(),
      peer_info  : peer.identity,
      task_id    : task_id
    };

    if (peer.local) {
      /**
       * Send task action to local node
       */
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

    /**
     * Send task action to remote node
     */
    debug('Routing task %s to %s:%s',
          task_id,
          peer.identity.public_ip,
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

      if (typeof(data) == 'string') {
        try {
          data = JSON.parse(data);
        } catch(e) {
        }
        data.server = peer.identity;
      }
      else if (typeof(data) == 'object')
        data.server = peer.identity;

      res.send(data);
    });

    return false;
  });
};

LoadBalancer.prototype.broadcast = function(req, res, next) {
  //@TODO with http multistream
};

module.exports = LoadBalancer;
