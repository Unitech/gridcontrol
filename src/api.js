/**
 * @file Expose API to CloudFunctions
 * @author Alexandre Strzelewicz
 * @project PM2 CloudFunctions
 */

var express    = require('express');
var bodyParser = require('body-parser');
var debug      = require('debug')('api');
var stringify  = require('./safeclonedeep.js');
var http       = require('http');
var https      = require('https');

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
  this.port         = opts.port || 10000;
  this.tls          = opts.tls;
  this.task_manager = opts.task_manager;
  this.file_manager = opts.file_manager;
  this.net_manager  = opts.net_manager;
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
  //this.server = https.createServer(that.auth, that.app);
  //else

  this.server = http.createServer(that.app);

  this.setMiddlewares();
  this.mountRoutes();

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

  this.app.use(bodyParser.urlencoded({
    extended : true
  }));

  // Attach task manager to request for child controllers
  this.app.use(function(req, res, next) {
    req.task_manager = that.task_manager;
    req.file_manager = that.file_manager;
    req.net_manager  = that.net_manager;
    next();
  });

  this.app.use(bodyParser.json());
};

/**
 * Mount API routes
 * @public
 */
API.prototype.mountRoutes = function() {
  var that = this;
  var app  = this.app;

  /**
   * Files endpoints
   */
  app.get('/files/get_current_sync', this.file_manager.controller.get_current_sync);

  /**
   * Task endpoints
   */
  app.get('/list_tasks', this.task_manager.controller.list_tasks);
  app.post('/trigger', this.task_manager.controller.trigger_task);
  app.post('/init_task_group', this.task_manager.controller.init_task_group);
  app.delete('/clear_all_tasks', this.task_manager.controller.clear_all_tasks);

  /**
   * Misc endpoints
   */
  app.get('/ping', function(req, res, next) {
    return res.send('pong');
  });

  app.get('/hosts/list', function(req, res, next) {
    return res.send(stringify(req.net_manager.getPeers()));
  });

  app.get('/conf', function(req, res, next) {
    res.send({
      file_manager : req.file_manager,
      task_manager : req.task_manager
    });
  });
};

module.exports = API;
