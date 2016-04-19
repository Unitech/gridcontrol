var express    = require('express');
var bodyParser = require('body-parser');
var pm2        = require('pm2');
var debug      = require('debug')('api');

var API = {
  setMiddlewares : function(app) {
    app.use(bodyParser.urlencoded({
      extended : true
    }));

    app.use(bodyParser.json());
  },
  mountRoutes : function(app) {
    var taskController  = require('./tasks/controller.js');
    var filesController = require('./files/controller.js');

    /**
     * Files endpoints
     */
    app.get('/files/get_current_sync', filesController.get_current_sync);

    /**
     * Task endpoints
     */
    app.get('/list_tasks', taskController.list_tasks);
    app.post('/trigger', taskController.trigger_task);
    app.post('/init_task_group', taskController.init_task_group);
    app.delete('/clear_all_tasks', taskController.clear_all_tasks);

    /**
     * Misc endpoints
     */
    app.get('/ping', function(req, res, next) {
      return res.send('pong');
    });

    app.get('/conf', function(req, res, next) {
      return res.send(global._task_meta);
    });

    app.post('/conf', function(req, res, next) {
      // Set current process as "the task master"
      if (req.body.is_file_master)
        global._task_meta.is_file_master = req.body.is_file_master;
      res.send(global._task_meta);
    });

  },
  expose : function(opts, cb) {
    var app  = express();
    var that = this;

    this.setMiddlewares(app);
    this.mountRoutes(app);

    pm2.connect(function() {
      debug('Connected to local PM2');

      that.server = app.listen(opts.port, function (err) {
        debug('Master listening on port %d', opts.port);
        return cb ? cb(err) : false;
      });
    });
  },
  stop : function() {
    pm2.disconnect();
    this.server.close();
  }
};

module.exports = API;
