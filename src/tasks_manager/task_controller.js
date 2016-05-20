
var request    = require('request');
var debug      = require('debug')('tasks');

var Controller = {};

/**
 * res.send(array_of_tasks)
 * @memberof TaskController
 * @method list_tasks
 */
Controller.list_tasks = function(req, res, next) {
  var tasks = req.task_manager.getTasks();
  return res.send(Object.keys(tasks).map(function (key) {return tasks[key]}));
};

Controller.clear_all_tasks = function(req, res, next) {
  req.task_manager.deleteAllPM2Tasks(function(err, tasks) {
    if (err) return next(err);
    return res.send({
      success:true,
      processes_deleted : tasks
    });
  });
};

Controller.init_task_group = function(req, res, next) {
  var base_folder = req.body.base_folder;
  var task_folder = req.body.task_folder || 'tasks';
  var instances   = req.body.instances;
  var json_conf   = req.body.json_conf;
  var env         = req.body.env || {};

  if (!base_folder)
    return next(new Error('base_folder is missing'));

  // 1# Set all peers as not synchronized
  req.net_manager.setAllPeersAsNotSynced();

  // 2# Find all tasks in local node in task_folder
  // 3# Start all tasks with PM2
  req.task_manager.initTaskGroup({
    base_folder : base_folder,
    task_folder : task_folder,
    instances   : instances,
    json_conf   : json_conf,
    env         : env
  }, function(err, procs) {
    if (err) return next(err);

    // 4# Create base_folder tarball
    // 5# Check if tarball's MD5 has changed
    req.file_manager.prepareSync(base_folder, function(e, infos) {
      if (e) {
        console.error('Got error while preparing to sync peers');
        return console.error(e);
      }

      console.log('Sync file generated for folder=%s target=%s',
                  infos.folder,
                  infos.target);

      if (infos.file_changed == true) {
        // 6.0# Send to each peer the file + metadata
        req.net_manager.askAllPeersToSync();
      }
      else {
        // 6.1# Tarball has not changed
        debug('Tarball MD5 has not changed. Set peers synchronized');
        req.net_manager.setAllPeersAsSynced();
      }
    });

    return res.send(procs);
  });
};

module.exports = Controller;
