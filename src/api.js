/**
 * @file Expose API to CloudFunctions
 * @author Alexandre Strzelewicz
 * @project PM2 CloudFunctions
 */

var express    = require('express');
var bodyParser = require('body-parser');
var http       = require('http');
var https      = require('https');
var fmt        = require('fmt');
var debug      = require('debug')('api');

/**
 * Set API default values
 * @constructor
 * @this {API}
 * @param opts {object} options
 * @param opts.port Port to listen on
 * @param opts.task_manager Task manager object
 * @param opts.file_manager File manager object
 * @param opts.file_manager Network manager (cloudfunctions.js) object
 * @param opts.tls TLS keys
 */
var API = function(opts) {
  this.load_balancer = opts.load_balancer;
  this.task_manager  = opts.task_manager;
  this.file_manager  = opts.file_manager;
  this.net_manager   = opts.net_manager;
  this.port          = opts.port || 10000;
  this.tls           = opts.tls;
};

/**
 * Start API and listen to port
 * @public
 */
API.prototype.start = function(cb) {
  var that = this;

  this.app  = express();

  this.server = null;

  //if (this.auth)
  //t
  //else

  //this.server = https.createServer(that.auth, that.app);
  this.server = http.createServer(that.app);

  this.setMiddlewares();
  this.mountRoutes();
  this.endMiddleware();

  that.server.listen(that.port, function (err) {
    debug('API listening on port %d', that.port);
    return cb ? cb(err) : false;
  });
};

/**
 * Stop API + Terminate Task manager
 * @public
 */
API.prototype.stop = function() {
  this.server.close();
  this.task_manager.terminate();
};

/**
 * Set Express middlewares (JSON parsing, Attach class to req)
 * @public
 */
API.prototype.setMiddlewares = function() {
  var that = this;

  var createDomain = require('domain').create;

  this.app.use(bodyParser.urlencoded({
    extended : true
  }));

  // Attach task manager to request for child controllers
  this.app.use(function(req, res, next) {
    var domain = createDomain();

    req.load_balancer = that.load_balancer;
    req.task_manager  = that.task_manager;
    req.file_manager  = that.file_manager;
    req.net_manager   = that.net_manager;

    domain.add(req);
    domain.add(res);
    domain.run(next);
    domain.on('error', next);
  });

  this.app.use(bodyParser.json());
};

// Error middleware + error formating
API.prototype.endMiddleware = function() {
  this.app.use(function(err, req, res, next) {
    fmt.sep();
    fmt.title('Error catched in express error middleware');
    if (err.stack)
      fmt.li(err.stack);
    if (err.type)
      fmt.li(err.type);
    if (err.msg)
      fmt.li(err.msg);
    if (err)
      fmt.dump(err);

    fmt.sep();
    fmt.title('Body params');
    fmt.dump(req.body);
    fmt.title('Query params');
    fmt.dump(req.params);
    fmt.sep();
    res.status(500).send({
      msg : err.message || err.msg,
      success : false
    });
  });
};

/**
 * Mount API routes
 * @public
 */
API.prototype.mountRoutes = function() {
  var that = this;
  var app  = this.app;

  // app.get({
  //   success:true
  // });

  /**
   * Files endpoints
   */
  app.get('/files/get_current_sync', this.file_manager.controller.get_current_sync);

  /**
   * Task endpoints
   */
  app.get('/tasks/list', this.task_manager.controller.list_tasks);
  app.delete('/tasks/clear', this.task_manager.controller.clear_all_tasks);

  app.post('/tasks/trigger_local', this.task_manager.controller.trigger_task);
  app.post('/tasks/lb_trigger_single', function(req, res, next) {
    return req.load_balancer.route(req, res, next);
  });

  app.post('/tasks/lb_trigger_all', function(req, res, next) {
    return req.load_balancer.route(req, res, next);
  });

  app.post('/tasks/init', this.task_manager.controller.init_task_group);

  app.get('/tasks/processing', function(req, res, next) {
    var tasks = req.load_balancer.processing_tasks;
    return res.send(Object.keys(tasks).map(function (key) {return tasks[key]}));
  });

  /**
   * Misc endpoints
   */
  app.get('/ping', function(req, res, next) {
    return res.send('pong');
  });

  app.get('/hosts/list', function(req, res, next) {
    var peers = [];

    req.net_manager.getPeers().forEach(function(peer) {
      peers.push(peer.identity);
    });

    peers.push(req.net_manager.getLocalIdentity());
    return res.send(peers);
  });

  app.get('/conf', function(req, res, next) {
    res.send({
      file_manager : req.file_manager,
      task_manager : req.task_manager
    });
  });
};

module.exports = API;
