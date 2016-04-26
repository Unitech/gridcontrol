
var fs         = require('fs');
var pm2        = require('pm2');
var async      = require('async');
var p          = require('path');
var debug      = require('debug')('task:management');
var Controller = require('./task_controller.js');
var extend     = require('util')._extend;

/**
 * The Task Manager manage all tasks
 * @constructor
 * @param opts {object} options
 * @param opts.port_offset {Integer} Port to start on
 */
var TaskManager = function(opts) {
  if (!opts) opts = {};

  this.port_offset = opts.port_offset || 10001;
  this.task_list   = {};
  // Defaults values
  this.task_meta   = {
    instances   : 0,
    json_conf   : null,
    task_folder : 'tasks',
    env         : {}
  };

  pm2.connect(function() {
    debug('Connected to local PM2');
  });

  this.controller = Controller;
};

TaskManager.prototype.terminate = function() {
  pm2.disconnect();
};

TaskManager.prototype.getTaskMeta = function() {
  return this.task_meta;
};

/**
 * Set Task default meta
 * @param task_meta Object
 */
TaskManager.prototype.setTaskMeta = function(task_meta) {
  this.task_meta = task_meta;
};

TaskManager.prototype.getTasks = function() {
  return this.task_list;
};

TaskManager.prototype.addTask = function(task_id, task) {
  if (!task.port)
    console.error('Port is missing');

  this.task_list[task_id] = task;
};

/**
 * List all tasks and .startTasks each of them
 * @param {object} opts options
 * @param {string} opts.base_folder absolute project path
 * @param {string} opts.task_folder absolute task folder path
 * @param {string} opts.instances number of instances of each script
 * @param {string} opts.json_conf NIY
 */
TaskManager.prototype.initTaskGroup = function(opts, cb) {
  var that = this;

  that.task_meta.instances   = opts.instances || 0;
  that.task_meta.json_conf   = opts.json_conf;
  that.task_meta.task_folder = opts.task_folder;
  that.task_meta.env         = opts.env || {};

  var fullpath_task = p.join(opts.base_folder, opts.task_folder);

  this.getAllTasksInFolder(fullpath_task, function(e, tasks_files) {
    if (e) return cb(e);

    that.startTasks(opts, tasks_files, function(err, procs) {
      if (e) return cb(e);
      return cb(null, procs);
    });
  });
};

/**
 * Start a list of task_files
 * @param {object} opts options
 * @param {string} opts.base_folder absolute project path
 * @param {string} opts.task_folder absolute task folder path
 * @param {string} opts.instances number of instances of each script
 * @param {string} opts.json_conf NIY
 * @param {array} tasks_files array of files (tasks)
 * @param {function} cb callback triggered once application started
 */
TaskManager.prototype.startTasks = function(opts, tasks_files, cb) {
  var that = this;
  var ret_procs = [];

  async.forEachLimit(tasks_files, 1, function(task_file, next) {
    var task_path     = p.join(opts.base_folder, opts.task_folder, task_file);
    var task_id       = p.basename(task_file, '.js');
    var task_pm2_name = 'task:' + task_id;
    var task_port;

    if (that.getTasks()[task_id])
      task_port     = that.getTasks()[task_id].port;
    else
      task_port = that.port_offset++;

    // Merge extra env passed at initialization
    var env = extend(opts.env, {
      TASK_PATH : task_path,
      TASK_PORT : task_port
    });

    pm2.start({
      script    : './lib/tasks_manager/task_wrapper.js',
      name      : task_pm2_name,
      instances : that.task_meta.instances,
      exec_mode : 'cluster',
      watch     : true,
      env       : env
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

/**
 * Get files in target folder
 * @param {string} tasks_fullpath Absolute path to list files
 * @param {function} cb callback called once files are listed
 */
TaskManager.prototype.getAllTasksInFolder = function(tasks_fullpath, cb) {
  fs.readdir(tasks_fullpath, function(err, task_files) {
    return cb(err, task_files);
  });
};

module.exports = TaskManager;
