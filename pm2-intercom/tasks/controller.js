
var pm2        = require('pm2');
var request    = require('request');
var debug      = require('debug')('task:controller');

var TaskManager = require('./manager.js');

var Controller = {};

Controller.list_tasks = function(req, res, next) {
  return res.send(req.task_manager.getTasks());
};

Controller.clear_all_tasks = function(req, res, next) {
  pm2.delete('all', function() {
    res.send({success:true});
  });
};

Controller.trigger_task = function(req, res, next) {
  var task_id  = req.body.task_id;

  var url = 'http://localhost:' + req.task_manager.getTasks()[task_id].port;

  // Proxy query to the right service
  req.pipe(request({
    url : url,
    form: req.body
  }), { end : false }).pipe(res);
};

Controller.init_task_group = function(req, res, next) {
  var base_folder = req.body.base_folder;
  var task_folder = req.body.task_folder;
  var instances   = req.body.instances;
  var json_conf   = req.body.json_conf;

  req.task_manager.initTaskGroup({
    base_folder : base_folder,
    task_folder : task_folder,
    instances   : instances,
    json_conf   : json_conf
  }, function(err, procs) {
    if (err) return next(err);

    req.file_manager.prepareSync(base_folder, function(e, dt) {
      console.log('Sync file generated for folder=%s target=%s', dt.folder, dt.target);
      req.net_manager.askAllPeersToSync();
    });

    return res.send(procs);
  });
};

module.exports = Controller;
