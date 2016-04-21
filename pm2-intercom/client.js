
var request = require('request');

var Intercom = function(task_name, data, cb) {
};

Intercom.all = function(task_name, data, eventemitter) {
};

/**
 * opts.task_folder
 * opts.instances
 * opts.env
 */
module.exports = function(opts) {
  // Call localhost conf

  Intercom.task_folder = opts.task_folder;
  Intercom.env         = opts.env;
  Intercom.base_url    = 'http://localhost:' + (opts.port || 10000);

  request.post({
    url : Intercom.base_url + '/conf',
    json : {
      is_file_master : true
    }
  }, function(err, res, body) {
    console.log('Localhost set as file master');
  });

  return Intercom;
}
