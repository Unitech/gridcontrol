'use strict'
const debug      = require('debug')('gc:tasks');
const defaults   = require('../constants.js');

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
  let task_folder = req.body.task_folder || defaults.TASK_FOLDER;
  let instances   = req.body.instances;
  let json_conf   = req.body.json_conf;
  let env         = req.body.env || {};
  // Can local compute tasks?
  let local       = (typeof(req.body.local) == 'undefined' || req.body.local == null) ? true : req.body.local;

  debug('new application initialialization request for app %s', base_folder);

  if (!base_folder)
    return next(new Error('base_folder is missing'));

  req.net_manager.setAllPeersAsNotSynced();

  req.task_manager.initTasks({
    base_folder : base_folder,
    task_folder : task_folder,
    instances   : instances,
    json_conf   : json_conf,
    local       : local,
    env         : env
  })
    .then((started_tasks) => {

      /**
       * In parallel compress app, spread link and ask peers to sync
       */
      req.file_manager.initializeAndSpread(base_folder)
        .then((link) => {
          req.net_manager.askAllPeersToSync();
        })
        .catch(e => {
          req.net_manager.setAllPeersAsSynced();
        });

      res.send(started_tasks);
    })
    .catch(e => {
      next(e);
    });
};


module.exports = Controller;
