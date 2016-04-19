
var fs         = require('fs');
var pm2        = require('pm2');
var async      = require('async');
var p          = require('path');
var debug      = require('debug')('task:management');

var TaskManagement = module.exports = {};

/**
 * Init a group of tasks
 * @param {string} opts.base_folder absolute project path
 * @param {string} opts.task_folder absolute task folder path
 * @param {string} opts.instances
 * @param {string} opts.json_conf
 */
TaskManagement.initTaskGroup = function(opts, cb) {
  var that = this;
  // 0 for Max instances depending on CPUs
  opts.instances   = opts.instances || 0;

  this.getAllTasksInFolder(opts.task_folder, function(e, tasks_files) {
    if (e) return cb(e);

    that.startTasks(opts, tasks_files, function(err, procs) {
      if (e) return cb(e);
      return cb(null, procs);
    });
  });
};

TaskManagement.startTasks = function(opts, tasks_files, cb) {
  var ret_procs = [];

  async.forEachLimit(tasks_files, 1, function(task_file, next) {
    var task_port     = global._task_meta.port_offset++;
    var task_path     = p.join(opts.task_folder, task_file);
    var task_id       = p.basename(task_file, '.js');
    var task_pm2_name = 'task:' + task_id;

    pm2.start({
      script    : './tasks/task_wrapper.js',
      name      : task_pm2_name,
      instances : opts.instances,
      exec_mode : 'cluster',
      env : {
        TASK_PATH : task_path,
        TASK_PORT : task_port
      }
    }, function(err, procs) {
      if (err)
        console.error(err);
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

TaskManagement.getAllTasksInFolder = function(tasks_fullpath, cb) {
  fs.readdir(tasks_fullpath, function(err, task_files) {
    return cb(err, task_files);
  });
};
