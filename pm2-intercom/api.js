var express    = require('express');
var bodyParser = require('body-parser');
var pm2        = require('pm2');

/**
 * Global object with task meta
 * list -> list of available tasks
 *   -> port     // Port on which task is running on
 *   -> task_id  // Task UID
 *   -> pm2_name // Task PM2 application name
 *   -> path     // Task full path
 * port_offset -> port on which task LB has to listen to
 */
global._task_meta = {
  list   : {},
  port_offset : 10001
};

var API = {
  setMiddlewares : function(app) {
    app.use(bodyParser.urlencoded({
      extended : true
    }));

    app.use(bodyParser.json());
  },
  mountRoutes : function(app) {
    var taskCommander = require('./controllers/taskCommander.js');

    app.get('/list_tasks', taskCommander.list_tasks);
    app.post('/trigger', taskCommander.trigger_task);
    app.post('/init_task_group', taskCommander.init_task_group);
  },
  expose : function(opts, cb) {
    var app  = express();
    var that = this;

    this.setMiddlewares(app);
    this.mountRoutes(app);

    pm2.connect(function() {
      console.log('Connected to localPM2');

      that.server = app.listen(opts.port, function (err) {
        console.log('Master listening on port %d', opts.port);
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
