
var p = path   = require('path');
var fs         = require('fs');
var pm2        = require('pm2');
var async      = require('async');
var request    = require('request');
var debug      = require('debug')('controller:taskCommander');

var TaskCommander = module.exports = {
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
    }), { end : false}).pipe(res);
  },
  init_task_group : function(req, res, next) {
    var base_folder = req.body.base_folder;
    var task_folder = req.body.task_folder;
    var instances   = req.body.instances;
    var json_conf   = req.body.json_conf;

    initTaskGroup({
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


/**
 * Init a group of tasks
 * @param {string} opts.base_folder absolute project path
 * @param {string} opts.task_folder absolute task folder path
 * @param {string} opts.instances
 * @param {string} opts.json_conf
 */
function initTaskGroup(opts, cb) {
  // 0 for Max instances depending on CPUs
  opts.instances   = opts.instances || 0;

  getAllTasksInFolder(opts.task_folder, function(e, tasks_files) {
    if (e) return cb(e);

    startTasks(opts, tasks_files, function(err, procs) {
      if (e) return cb(e);
      return cb(null, procs);
    });
  });
};


var startTasks = TaskCommander._startTasks = function(opts, tasks_files, cb) {
  var ret_procs = [];

  async.forEachLimit(tasks_files, 1, function(task_file, next) {
    var task_port     = global._task_meta.port_offset++;
    var task_path     = p.join(opts.task_folder, task_file);
    var task_id       = p.basename(task_file, '.js');
    var task_pm2_name = 'task:' + task_id;

    pm2.start({
      script    : 'task_wrapper.js',
      name      : task_pm2_name,
      instances : opts.instances,
      exec_mode : 'cluster',
      env : {
        TASK_PATH : task_path,
        TASK_PORT : task_port
      }
    }, function(err, procs) {
      debug('Task id: %s, pm2_name: %s, exposed on port: %d',
            task_id, task_pm2_name, task_port);

      global._task_meta.list[task_id] = {
        port     : task_port,
        task_id  : task_id,
        pm2_name : task_pm2_name,
        path     : task_path
      };

      next();
    });

  }, function(e) {
    debug('%d tasks successfully started', tasks_files.length);
    return cb(e, global._task_meta.list);
  });
};

var getAllTasksInFolder = TaskCommander._getAllTasksInFolder = function(tasks_fullpath, cb) {
  fs.readdir(tasks_fullpath, function(err, task_files) {
    return cb(err, task_files);
  });
};
