var express    = require('express');
var bodyParser = require('body-parser');
var pm2        = require('pm2');
var debug      = require('debug')('api');
var stringify  = require('./lib/safeclonedeep.js');

var API = function(opts) {
  this.port         = opts.port || 10000;
  this.task_manager = opts.task_manager;
  this.file_manager = opts.file_manager;
  this.net_manager  = opts.net_manager;
};

API.prototype.start = function(cb) {
  var that = this;

  this.app  = express();

  this.setMiddlewares();
  this.mountRoutes();

  pm2.connect(function() {
    debug('Connected to local PM2');

    that.server = that.app.listen(that.port, function (err) {
      debug('API listening on port %d', that.port);
      return cb ? cb(err) : false;
    });
  });
};

API.prototype.stop = function() {
  pm2.disconnect();
  this.server.close();
};

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

  app.post('/conf', function(req, res, next) {
    // Set current process as "the task master"
    if (req.body.is_file_master) {
      req.file_manager.setFileMaster(true);
    }
    res.send({
      file_manager : req.file_manager,
      task_manager : req.task_manager
    });
  });

};

module.exports = API;
