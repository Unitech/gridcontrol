
var pm2        = require('pm2');
var request    = require('request');
var debug      = require('debug')('task:controller');

var TaskManagement = require('./task_management.js');

var Controller = module.exports = {
  list_tasks : function(req, res, next) {
    return res.send(global._task_meta.list);
  },
  clear_all_tasks : function(req, res, next) {
    pm2.delete('all', function() {
      res.send({success:true});
    });
  },
  trigger_task: function(req, res, next) {
    var task_id  = req.body.task_id;

    var url = 'http://localhost:' + global._task_meta.list[task_id].port;

    // Proxy query to the right service
    req.pipe(request({
      url : url,
      form: req.body
    }), { end : false }).pipe(res);
  },
  init_task_group : function(req, res, next) {
    var base_folder = req.body.base_folder;
    var task_folder = req.body.task_folder;
    var instances   = req.body.instances;
    var json_conf   = req.body.json_conf;

    TaskManagement.initTaskGroup({
      base_folder : base_folder,
      task_folder : task_folder,
      instances   : instances,
      json_conf   : json_conf
    }, function(err, procs) {
      if (err) return next(err);
      return res.send(procs);
    });
  }
};
