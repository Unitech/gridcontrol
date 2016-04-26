
var request    = require('request');

/**
 * Load balancer
 * @constructor
 * @param opts {object} options
 * @param opts.task_manager {object} task manager object
 * @param opts.net_manager {object} net manager object
 * @param opts.local_loop {boolean} should the LB proxy query to local?
 */
var LoadBalancer = function(opts) {
  //this.task_manager = opts.task_manager;
  //this.net_manager  = opts.net_manager;
  this.local_loop        = opts.local_loop || true;

  // Round robin index
  this.rri = 0;
};

LoadBalancer.prototype.route = function(req, res, next) {
  var task_id  = req.body.task_id;
  var that = this;

  var url = 'http://localhost:' + req.task_manager.getTasks()[task_id].port;

  // Avoid integer overflow
  if (Number.isSafeInteger(that.rri) === false)
    that.rri = 0;

  var peers  = req.net_manager.getPeers();
  // Round Robin
  var target = peers[that.rri++ % peers.length];

  // + Log running tasks for smarter load balancing in the future
  // + link with HealthCheck regular data to know load
  console.log(target.identity);

  var a = request({
    url : url,
    form: req.body
  });

  function onErr() {
    console.error('Error while pipping data');
    res.end();
  }
  // Proxy query to the right service
  req
    .pipe(a, { end : false })
    .on('error', onErr)
    .pipe(res)
    .on('error', onErr);
};

module.exports = LoadBalancer;
