'use strict';
const fs         = require('fs');
const pm2        = require('pm2');
const async      = require('async');
const p          = require('path');
const request    = require('request');
const debug      = require('debug')('tasks');
const Controller = require('./task_controller.js');
const Tools      = require('../lib/tools.js');
const extend     = require('util')._extend;

/**
 * The Task Manager manage all tasks
 * @constructor
 * @param opts {object} options
 * @param opts.port_offset {Integer} Port to start on
 */
const TaskManager = function(opts) {
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
 * @return Promise
 */
TaskManager.prototype.initTaskGroup = function(opts) {
  if (!opts.env)
    opts.env = {};

  this.task_meta.instances   = opts.instances || 0;
  this.task_meta.json_conf   = opts.json_conf;
  this.task_meta.task_folder = opts.task_folder;
  this.task_meta.env         = opts.env;

  // base_folder not on task_meta, because on peers path is different
  var fullpath_task = p.join(opts.base_folder, opts.task_folder);

  return this.getAllTasksInFolder(fullpath_task)
  .then((tasks_files) => {
    return this.startTasks(opts, tasks_files)
  });
};

TaskManager.prototype.listAllPM2Tasks = function() {
  return new Promise((resolve, reject) => {
    pm2.list(function(err, proc_list) {
      if (err) return reject(err);

      let ret = {};

      proc_list.forEach(function(proc) {
        if (proc.name.lastIndexOf('task:', 0) > -1)
          ret[proc.name] = {};
      });

      resolve(Object.keys(ret));
    });
  });
};

TaskManager.prototype.deleteAllPM2Tasks = function() {
  return this.listAllPM2Tasks()
  .then((tasks_proc) => {
    return new Promise((resolve, reject) => {
      async.forEachLimit(tasks_proc, 5, function(proc_name, next) {
        pm2.delete(proc_name, next);
      }, function(err) {
        if(err) { return reject(err); }
        resolve(tasks_proc);
      });
    })
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
 * @return Promise
 */
TaskManager.prototype.startTasks = function(opts, tasks_files) {
  let ret_procs = [];

  // First delete all process with a name starting with task:
  return this.deleteAllPM2Tasks()
  .then(() => {
    return new Promise((resolve, reject) => {
      // Then start all file
      async.forEachLimit(tasks_files, 5, (task_file, next) => {
        let task_path     = p.join(opts.base_folder, opts.task_folder, task_file);
        let task_id       = p.basename(task_file).split('.')[0];
        let task_pm2_name = 'task:' + task_id;
        let task_port;
        let tasks = this.getTasks() ;

        if (tasks[task_id] && tasks[task_id].port) {
          task_port = tasks[task_id].port;
        } else {
          task_port = this.port_offset++;
        }

        // Merge extra env passed at initialization
        let env = extend(opts.env, {
          TASK_PATH : task_path,
          TASK_PORT : task_port
        });

        let pm2_opts = {
          script    : task_path,
          name      : task_pm2_name,
          watch     : true,
          env       : Tools.safeClone(env)
        };

        if (p.extname(task_path) == '.js') {
          pm2_opts.script = p.join(__dirname, 'task_wrapper.js'),
          pm2_opts.exec_mode = 'cluster'
          pm2_opts.instances = this.task_meta.instances
        }

        pm2.start(pm2_opts, (err, procs) => {
          if (err) {
            return next(err);
          }

          debug('Task id: %s, pm2_name: %s, exposed on port: %d',
                task_id, task_pm2_name, task_port);

          this.addTask(task_id, {
            port     : task_port,
            task_id  : task_id,
            pm2_name : task_pm2_name,
            path     : task_path
          });

          next();
        });

      }, (e) => {
        if (e) { return reject(e); }
        debug('%d tasks successfully started', tasks_files.length);
        return resolve(this.getTasks());
      });
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
  let script      = opts.task_id.split('.')[0];
  let handler     = opts.task_id.split('.')[1] || null;

  function launch() {
    let tasks = this.getTasks()
    let url = 'http://localhost:' + tasks[script].port + '/';
    let req_opts = {
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

    return new Promise((resolve, reject) => {
      request.post(req_opts, function(err, raw, body) {
        if (err) {
          return reject(err);
        }

        try {
          body = JSON.parse(body);
        } catch(e) {
          return reject(e)
        }

        resolve(body);
      });
    })
    .catch(function(err) {
      if (err.code == 'ECONNREFUSED') {
        debug('Econnrefused, script not online yet, retrying');
        setTimeout(function() { launch(cb); }, 200);
        return
      }

      return Promise.reject(err)
    })
  }

  if (this.getTasks()[script])
    return launch();

  /**
   * Retry system
   */
  let retry_count = 0;
  let inter

  return new Promise((resolve, reject) => {
    inter = setInterval(() => {
      if (this.getTasks()[script]) {
        clearInterval(inter);
        return launch()
        .then(resolve).catch(reject);
      }

      debug('Retrying task %s', script);

      //@TODO configure
      if (retry_count++ > 12) {
        clearInterval(inter);
        return reject(new Error('Unknown script ' + script));
      }
    }, 500);
  })
};


/**
 * Get files in target folder
 * @param {string} tasks_fullpath Absolute path to list files
 * @param {function} cb callback called once files are listed
 */
TaskManager.prototype.getAllTasksInFolder = function(tasks_fullpath) {
  return new Promise((resolve, reject) => {
    fs.readdir(tasks_fullpath, function(err, task_files) {
      if (err) { return reject(err); }
      resolve(task_files);
    });
  })
};

module.exports = TaskManager;
