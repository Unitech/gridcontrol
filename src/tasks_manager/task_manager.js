
var fs         = require('fs');
var pm2        = require('pm2');
var async      = require('async');
var p          = require('path');
var request    = require('request');
var debug      = require('debug')('tasks');
var Controller = require('./task_controller.js');
var Tools      = require('../lib/tools.js');
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

  if (opts.task_meta)
    this.task_meta = opts.task_meta;

  pm2.connect(function() {
    debug('Connected to local PM2');
  });

  this.controller = Controller;
};

TaskManager.prototype.serialize = function() {
  return {
    task_meta : this.task_meta
  };
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
 * @param {string} opts.base_folder ABSOLUTE project path
 * @param {string} opts.task_folder RELATIVE task folder path
 * @param {string} opts.instances number of instances of each script
 * @param {string} opts.json_conf NIY
 */
TaskManager.prototype.initTaskGroup = function(opts, cb) {
  var that = this;

  if (!opts.env)
    opts.env = {};

  that.task_meta.instances   = opts.instances || 0;
  that.task_meta.json_conf   = opts.json_conf;
  that.task_meta.task_folder = opts.task_folder;
  that.task_meta.env         = opts.env;

  // base_folder not on task_meta, because on peers path is different
  var fullpath_task = p.join(opts.base_folder, opts.task_folder);

  this.getAllTasksInFolder(fullpath_task, function(e, tasks_files) {
    if (e) return cb(e);

    that.startTasks(opts, tasks_files, function(err, procs) {
      if (e) return cb(e);
      return cb(null, procs);
    });
  });
};

TaskManager.prototype.listAllPM2Tasks = function(cb) {
  pm2.list(function(err, proc_list) {
    if (err) return cb(err);

    var ret = {};

    proc_list.forEach(function(proc) {
      if (proc.name.lastIndexOf('task:', 0) > -1)
        ret[proc.name] = {};
    });

    cb(null, Object.keys(ret));
  });
};

TaskManager.prototype.deleteAllPM2Tasks = function(cb) {
  this.listAllPM2Tasks(function(err, tasks_proc) {
    if (err) return cb(err);

    async.forEachLimit(tasks_proc, 1, function(proc_name, next) {
      pm2.delete(proc_name, next);
    }, function(err) {
      return cb(err, tasks_proc);
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

  // First delete all process with a name starting with task:
  this.deleteAllPM2Tasks(function(err) {
    if (err) console.error(err);

    // Then start all file
    async.forEachLimit(tasks_files, 1, function(task_file, next) {
      var task_path     = p.join(opts.base_folder, opts.task_folder, task_file);
      var task_id       = p.basename(task_file).split('.')[0];
      var task_pm2_name = 'task:' + task_id;
      var task_port;

      if (that.getTasks()[task_id])
        task_port = that.getTasks()[task_id].port;
      else
        task_port = that.port_offset++;

      // Merge extra env passed at initialization
      var env = extend(opts.env, {
        TASK_PATH : task_path,
        TASK_PORT : task_port
      });

      var pm2_opts = {};

      if (p.extname(task_path) == '.js') {
        pm2_opts = {
          script    : p.join(__dirname, 'task_wrapper.js'),
          name      : task_pm2_name,
          instances : that.task_meta.instances,
          exec_mode : 'cluster',
          watch     : true,
          env       : Tools.safeClone(env)
        };
      }
      else {
        pm2_opts = {
          script    : task_path,
          name      : task_pm2_name,
          watch     : true,
          env       : Tools.safeClone(env)
        };
      }

      pm2.start(pm2_opts, function(err, procs) {
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
  });
};

/**
 * Trigger a task
 * @param {object} opts options
 * @param {string} opts.task_data data to be passed to function
 * @param {string} opts.task_id full string of the function to call (script name + handle)
 * @param {object} opts.task_opts options about function execution (e.g. timeout)
 */
TaskManager.prototype.triggerTask = function(opts, cb) {
  var that        = this;

  var script      = opts.task_id.split('.')[0];
  var handler     = opts.task_id.split('.')[1] || null;

  function launch(cb) {
    var url = 'http://localhost:' + that.getTasks()[script].port + '/';

    var req_opts = {
      url : url,
      form: {
        data    : opts.task_data,
        context : {
          handler : handler
        }
      }
    };

    if (opts.task_opts && opts.task_opts.timeout) {
      req_opts.timeout = parseInt(opts.task_opts.timeout);
    }

    request.post(req_opts, function(err, raw, body) {
      if (err && err.code == 'ECONNREFUSED') {
        debug('Econnrefused, script not online yet, retrying');
        setTimeout(function() { launch(cb); }, 200);
        return false;
      }
      return cb(err, body);
    });
  }

  if (that.getTasks()[script])
    return launch(cb);

  /**
   * Retry system
   */
  var retry_count = 0;

  var inter = setInterval(function() {
    if (that.getTasks()[script]) {
      clearInterval(inter);
      return launch(cb);
    }
    debug('Retrying task %s', script);
    if (retry_count++ > 12) {
      clearInterval(inter);
      return cb('Unknown script ' + script);
    }
  }, 500);
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
