'use strict';
const request  = require('request');
const crypto   = require('crypto');
const debug    = require('debug')('gc:load-balancer');
const bluebird = require('bluebird')
const Tools    = require('./lib/tools.js');
const defaults = require('./constants.js');

/**
 * Load balancer
 * @constructor
 */
const LoadBalancer = function(opts) {
  this._rri = 0;
  this.processing_tasks = {};
};

/**
 * Method to find suitable peer
 * for now it only checks if peer is SYNCHRONIZED + TASKS have been started
 * @param req {object} Express req object
 */
LoadBalancer.prototype.findSuitablePeer = function(req) {
  let promise = (retry) => {
    if (retry++ > defaults.FIND_SUITABLE_PEER_RETRY) {
      return Promise.reject(new Error('Too many retries on route request while searching for a suitable peer')) ;
    }

    let peer_list = req.net_manager.getPeerList();

    if (peer_list.length === 0) {
      debug('Not any peers is synced (and local compute is not activated)');
      return bluebird.delay(500).then(() => promise(retry));
    }

    let target = peer_list[this._rri++ % peer_list.length];

    //@todo take monitoring data into account
    if (target.identity.synchronized == false) {
      return bluebird.delay(100).then(() => promise(retry));
    }

    return Promise.resolve(target)
  }

  return promise(0)
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
  let task_id   = req.body.task_id;
  let task_data = req.body.data || null;
  let task_opts = req.body.opts || {};
  let uuid      = crypto.randomBytes(32).toString('hex');

  // Avoid integer overflow
  if (Number.isSafeInteger(this._rri) === false) {
    this._rri = 0;
  }

  this.findSuitablePeer(req)
    .catch(err => {
      console.error(err.message || err);
      return res.send(Tools.safeClone({ err : err }));
    })
    .then((peer) => {
      if (req.task_manager.taskExists(task_id) == false) {
        return res.send({err : Tools.safeClone(new Error('Task file ' + task_id.split('.')[0] + ' does not exists'))});
      }

      // @todo: do stats on task processing (invokation, errors...)
      this.processing_tasks[uuid] = {
        started_at : new Date(),
        peer_info  : peer.identity,
        task_id    : task_id
      };

      if (peer.local) {
        /**
         * send task action to local node
         */
        debug('status=routing task=%s target=localhost', task_id);
        return req.task_manager.triggerTask({
          task_id  : task_id,
          task_data: task_data,
          task_opts: task_opts
        })
          .then((data) => {
            delete this.processing_tasks[uuid];
            data.server = req.net_manager.getLocalIdentity();
            res.send(data);
          })
          .catch((err) => {
            delete this.processing_tasks[uuid];
            res.send({err: err});
          });
      }

      debug('Routing task %s to %s:%s',
            task_id,
            peer.identity.public_ip,
            peer.identity.api_port);

      peer.send('trigger', {
        task_id : task_id,
        data    : task_data,
        opts    : task_opts
      }, function(err, data) {
        delete this.processing_tasks[uuid];
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
    });
};

LoadBalancer.prototype.broadcast = function(req, res, next) {
  //@todo http multistream
};

module.exports = LoadBalancer;
