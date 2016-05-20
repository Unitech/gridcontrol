'use strict'
const request    = require('request');
const debug      = require('debug')('tasks');

const Controller = {};

/**
 * res.send(array_of_tasks)
 * @memberof TaskController
 * @method list_tasks
 */
Controller.list_tasks = function(req, res, next) {
  let tasks = req.task_manager.getTasks();
  return res.send(Object.keys(tasks).map((key) => tasks[key]));
};

Controller.clear_all_tasks = function(req, res, next) {
  req.task_manager.deleteAllPM2Tasks()
  .then((tasks) => {
    res.send({
      success:true,
      processes_deleted : tasks
    });
  })
  .catch(next);
};

Controller.init_task_group = function(req, res, next) {
  let base_folder = req.body.base_folder;
  let task_folder = req.body.task_folder;
  let instances   = req.body.instances;
  let json_conf   = req.body.json_conf;
  let env         = req.body.env || {};

  req.task_manager.initTaskGroup({
    base_folder : base_folder,
    task_folder : task_folder,
    instances   : instances,
    json_conf   : json_conf,
    env         : env
  })
  .then((procs) => {
    req.file_manager.prepareSync(base_folder, function(e, infos) {
      console.log('Sync file generated for folder=%s target=%s',
                  infos.folder,
                  infos.target);
      if (infos.file_changed == true) {
        req.net_manager.askAllPeersToSync();
      } else {
        debug('Files not modified, skipping sync');
      }
    });

    res.send(procs);
  })
  .catch((err) => {
    console.error('Got error while generating Syncro package. Please retry init.');
    console.error(err);
  });
};

module.exports = Controller;
