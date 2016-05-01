
var request    = require('request');
var crypto     = require('crypto');

/**
 * Load balancer
 * @constructor
 * @param opts {object} options
 * @param opts.task_manager {object} task manager object
 * @param opts.net_manager {object} net manager object
 * @param opts.local_loop {boolean} should the LB proxy query to local?
 */
var LoadBalancer = function(opts) {
  this.local_loop        = opts.local_loop || true;

  this.stats_tasks = {};
  this.processing_tasks = {};
  // Round robin index
  this.rri = 0;
};

LoadBalancer.prototype.findSuitablePeer = function(req, cb) {
  var that   = this;
  var retry  = 0;

  //@todo take monitoring data into account
  function genPeerHash() {
    var remote_peers  = req.net_manager.getPeers();
    var all_peers     = [];

    remote_peers.forEach(function(peer) {
      all_peers.push(peer.indentity);
    });

    if (that.local_loop)
      all_peers.push(req.net_manager.getLocalIdentity());

    return all_peers;
  };


  (function rec() {
    if (retry++ > 15)
      console.error('Trying too many time to route request!');

    var peers  = genPeerHash();
    var target = peers[that.rri++ % peers.length];
    if (target.synchronized == false)
      setTimeout(rec, 100);
    else return cb(null, target);
  })();
}

LoadBalancer.prototype.broadcast = function(req, res, next) {
};

LoadBalancer.prototype.route = function(req, res, next) {
  var task_id  = req.body.task_id;
  var that = this;

  var task_exec_id = crypto.randomBytes(32).toString('hex');

  // Avoid integer overflow
  if (Number.isSafeInteger(that.rri) === false)
    that.rri = 0;

  this.findSuitablePeer(function(err, peer) {
    var url = 'http://' + peer.identity.ip + ':' + peer.identity.api_port + '/';

    var a = request({
      url : url,
      form: req.body
    });

    // @todo: do stats on task processing (invokation, errors...)
    // + Log running tasks for smarter load balancing in the future
    // + link with HealthCheck regular data to know load
    // if (!that.stats_tasks[task_id])

    that.processing_tasks[task_exec_id] = {
      started_at : new Date(),
      peer_info  : peer.identity,
      task_id    : task_id,
      rout_url   : url
    };

    function onErr() {
      delete that.processing_tasks[task_exec_id];
      console.error('Error while pipping data');
      res.end();
    }

    a.on('error', onErr);

    a.on('end', function() {
      delete that.processing_tasks[task_exec_id];
    });

    // Proxy query to the right service
    req
      .pipe(a, { end : false })
      .pipe(res)
      .on('error', onErr);
  });
};

module.exports = LoadBalancer;
