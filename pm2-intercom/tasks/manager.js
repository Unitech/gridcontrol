
var fs         = require('fs');
var pm2        = require('pm2');
var async      = require('async');
var p          = require('path');
var debug      = require('debug')('task:management');
var Controller = require('./controller.js');

var TaskManagement = function(opts) {
  this.port_offset = opts.port_offset || 10001;
  this.task_list   = {};
  this.task_meta   = {
    instances   : 0,
    json_conf   : null,
    task_folder : 'tasks'
  };

  this.controller = Controller;
};

TaskManagement.prototype.getTaskMeta = function() {
  return this.task_meta;
};

TaskManagement.prototype.setTaskMeta = function(task_meta) {
  this.task_meta = task_meta;
};

TaskManagement.prototype.getTasks = function() {
  return this.task_list;
};

TaskManagement.prototype.addTask = function(task_id, task) {
  if (!task.port)
    console.error('Port is missing');

  this.task_list[task_id] = task;
};

/**
 * Init a group of tasks
 * @param {string} opts.base_folder absolute project path
 * @param {string} opts.task_folder absolute task folder path
 * @param {string} opts.instances
 * @param {string} opts.json_conf
 */
TaskManagement.prototype.initTaskGroup = function(opts, cb) {
  var that = this;

  that.task_meta.instances   = opts.instances || 0;
  that.task_meta.json_conf   = opts.json_conf;
  that.task_meta.task_folder = opts.task_folder;

  var fullpath_task = p.join(opts.base_folder, opts.task_folder);

  this.getAllTasksInFolder(fullpath_task, function(e, tasks_files) {
    if (e) return cb(e);

    that.startTasks(opts, tasks_files, function(err, procs) {
      if (e) return cb(e);
      return cb(null, procs);
    });
  });
};

TaskManagement.prototype.startTasks = function(opts, tasks_files, cb) {
  var that = this;
  var ret_procs = [];

  async.forEachLimit(tasks_files, 1, function(task_file, next) {
    var task_port     = that.port_offset++;
    var task_path     = p.join(opts.task_folder, task_file);
    var task_id       = p.basename(task_file, '.js');
    var task_pm2_name = 'task:' + task_id;

    pm2.start({
      script    : './tasks/task_wrapper.js',
      name      : task_pm2_name,
      instances : that.task_meta.instances,
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

      that.addTask(task_id, {
        port     : task_port,
        task_id  : task_id,
        pm2_name : task_pm2_name,
        path     : task_path
      });

      next();
    });

  }, function(e) {
    debug('%d tasks successfully started', tasks_files.length);
    return cb(e, that.getTasks());
  });
};

TaskManagement.prototype.getAllTasksInFolder = function(tasks_fullpath, cb) {
  fs.readdir(tasks_fullpath, function(err, task_files) {
    return cb(err, task_files);
  });
};

module.exports = TaskManagement;
