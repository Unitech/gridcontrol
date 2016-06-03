'use strict';
const p          = require('path');
const request    = require('request');
const debug      = require('debug')('gc:tasks');
const Controller = require('./task_controller.js');
const Tools      = require('../lib/tools.js');
const extend     = require('util')._extend;
const bluebird   = require('bluebird')
const fs         = bluebird.promisifyAll(require('fs'));
const pm2        = bluebird.promisifyAll(require('pm2'));

/**
 * The Task Manager manage all tasks
 * @constructor
 * @param opts {object} options
 * @param opts.port_offset {Integer} Port to start on
 */
const TaskManager = function(opts) {
  if (!opts) opts = {};

  this.port_offset = opts.port_offset ? parseInt(opts.port_offset) : 10001;
  this.task_list   = {};
  this.can_accept_queries = false;

  // Defaults values
  this.task_meta   = {
    instances   : 0,
    json_conf   : null,
    task_folder : 'tasks',
    env         : {}
  };

  if (opts.task_meta)
    this.task_meta = opts.task_meta;

  this.controller = Controller;
};

TaskManager.prototype.start = function() {
  return new Promise(resolve => {
    return pm2.connect(function() {
      return resolve();
    });
  });
};

TaskManager.prototype.serialize = function() {
  return {
    task_meta : this.task_meta
  };
};

TaskManager.prototype.terminate = function() {
  debug('Terminating all tasks');
  pm2.disconnect();
  this.deleteAllPM2Tasks();
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

/**
 * Check if task exists
 * @param {string} task_id task id (script or script.handler)
 */
TaskManager.prototype.taskExists = function(task_id) {
  var script      = task_id.split('.')[0];

  return this.getTasks()[script] ? true : false;
};

TaskManager.prototype.addTask = function(task_id, task) {
  if (!task.port)
    console.error('Port is missing');

  this.task_list[task_id] = task;
};

/**
 * List all tasks and start each of them
 * @param {object} opts options
 * @param {string} opts.base_folder ABSOLUTE project path
 * @param {string} opts.task_folder RELATIVE task folder path
 * @param {string} opts.instances number of instances of each script
 * @param {string} opts.json_conf Not used yet
 * @return Promise
 */
TaskManager.prototype.initTasks = function(opts) {
  if (!opts.env)
    opts.env = {};

  this.task_meta.instances   = opts.instances || 0;
  this.task_meta.json_conf   = opts.json_conf;
  this.task_meta.task_folder = opts.task_folder;
  this.task_meta.env         = opts.env;
  this.can_accept_queries = false;

  // base_folder not on task_meta, because on peers path is different
  var fullpath_task = p.join(opts.base_folder, opts.task_folder);

  return this.getAllTasksInFolder(fullpath_task)
    .then((tasks_files) => {
      return this.startAllTasks(opts, tasks_files)
    })
    .then((procs) => {
      this.can_accept_queries = true;
      return Promise.resolve(procs)
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
      return bluebird.map(tasks_proc, (proc_name) => {
        return new Promise(resolve => {
          pm2.delete(proc_name, resolve);
        })
      }, {concurrency: 5});
    });
};

/**
 * Start a list of task_files
 * @param {array} tasks_files array of files (tasks)
 * @return Promise
 */
TaskManager.prototype.startAllTasks = function(opts, tasks_files) {
  let ret_procs = [];

  // First delete all process with a name starting with task:
  return this.deleteAllPM2Tasks()
    .then(() => {
      return bluebird.map(tasks_files, (task_file) => this.startTask(task_file), {concurrency: 5})
  })
  .then(() => {
    return Promise.resolve(this.getTasks())
  });
};

TaskManager.prototype.startTask = function(task_file_path) {
  let task_id       = p.basename(task_file_path).split('.')[0];
  let task_pm2_name = 'task:' + task_id;
  let task_port;
  let tasks = this.getTasks()

  if (tasks[task_id])
    task_port = tasks[task_id].port;
  else
    task_port = this.port_offset++;

  // Merge extra env passed at initialization
  let env = extend(this.task_meta.env, {
    TASK_PATH : task_file_path,
    TASK_PORT : task_port
  });

  let pm2_opts = {};

  if (p.extname(task_file_path) == '.js') {
    pm2_opts = {
      script    : p.join(__dirname, 'task_wrapper.js'),
      name      : task_pm2_name,
      instances : this.task_meta.instances,
      exec_mode : 'cluster',
      watch     : true,
      env       : Tools.safeClone(env)
    };
  } else {
    pm2_opts = {
      script    : task_file_path,
      name      : task_pm2_name,
      watch     : true,
      env       : Tools.safeClone(env)
    };
  }

  return pm2.startAsync(pm2_opts)
    .then((procs) => {
      this.addTask(task_id, {
        port     : task_port,
        task_id  : task_id,
        pm2_name : task_pm2_name,
        path     : task_file_path
      })

      debug('status=task_started id=%s pm2_name=%s', task_id, task_pm2_name);
      return Promise.resolve(procs);
    })
    .catch((err) => {
      return Promise.reject(err)
    });
}

/**
 * Trigger a task
 * @param {object} opts options
 * @param {string} opts.task_data data to be passed to function
 * @param {string} opts.task_id full string of the function to call (script name + handle)
 * @param {object} opts.task_opts options about function execution (e.g. timeout)
 */
TaskManager.prototype.triggerTask = function(opts) {
  let that = this
  let script      = opts.task_id.split('.')[0];
  let handler     = opts.task_id.split('.')[1] || null;

  if (opts.retry_count === undefined) {
    opts.retry_count = 0;
  }

  //@TODO configure
  if (opts.retry_count++ > 12) {
    return Promise.reject(new Error('Unknown script ' + script));
  }

  function launch() {
    let tasks = that.getTasks()
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
          return reject(e);
        }

        debug('status=action_success task=%s', script);

        delete opts.retry_count
        resolve(body);
      });
    })
    .catch(function(err) {
      if (err.code == 'ECONNREFUSED') {
        debug('status=action_retry msg=script not online yet task=%s', script);
        return bluebird.delay(200).then(() => that.triggerTask(opts))
      }

      return Promise.reject(err)
    })
  }

  if (this.getTasks()[script])
    return launch();

  //@todo configure
  return bluebird.delay(500).then(() => this.triggerTask(opts))
};


/**
 * Get files in target folder
 * @param {string} tasks_fullpath Absolute path to list files
 * @param {function} cb callback called once files are listed
 */
TaskManager.prototype.getAllTasksInFolder = function(tasks_fullpath) {
  return fs.readdirAsync(tasks_fullpath)
  .then((task_files) => {
    task_files = task_files.map(f => p.join(tasks_fullpath, f))
    return Promise.resolve(task_files)
  })
};

module.exports = TaskManager;
