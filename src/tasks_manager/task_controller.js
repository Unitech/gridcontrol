
var request    = require('request');
var debug      = require('debug')('tasks');

/**
 * @namespace TaskController
 */
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

// Controller.trigger_task = function(req, res, next) {
//   var task_id  = req.body.task_id;
//   var retry_count = 0;

//   /**
//    * Buffering system
//    */
//   if (!req.task_manager.getTasks()[task_id]) {
//     var inter = setInterval(function() {
//       if (req.task_manager.getTasks()[task_id]) {
//         clearInterval(inter);
//         return Controller.trigger_task(req, res, next);
//       }
//       retry_count++;
//       if (retry_count > 6) {
//         console.log(retry_count);
//         clearInterval(inter);
//         return next(new Error('Task [' + task_id + '] not found'));
//       }
//     }, 1000);
//     return false;
//   }

//   var url = 'http://localhost:' + req.task_manager.getTasks()[task_id].port + '/';

//   debug('Local trigger, hitting url %s', url);

//   var a = request({
//     url : url,
//     form: req.body
//   });

//   function onErr() {
//     console.error('Error while pipping data');
//     res.end();
//   }
//   // Proxy query to the right service
//   req
//     .pipe(a, { end : false })
//     .on('error', onErr)
//     .pipe(res)
//     .on('error', onErr);
// };

Controller.init_task_group = function(req, res, next) {
  var base_folder = req.body.base_folder;
  var task_folder = req.body.task_folder;
  var instances   = req.body.instances;
  var json_conf   = req.body.json_conf;
  var env         = req.body.env || {};

  req.task_manager.initTaskGroup({
    base_folder : base_folder,
    task_folder : task_folder,
    instances   : instances,
    json_conf   : json_conf,
    env         : env
  }, function(err, procs) {
    if (err) return next(err);

    req.file_manager.prepareSync(base_folder, function(e, dt) {
      if (e) {
        console.error('Got error while generating Syncro package. Please retry init.');
        return console.error(e);
      }
      console.log('Sync file generated for folder=%s target=%s', dt.folder, dt.target);
      req.net_manager.askAllPeersToSync();
    });

    return res.send(procs);
  });
};

module.exports = Controller;
