
var Intercom = {
  API     : require('./api.js'),
  network : require('./network.js')
};

var os      = require('os');
var address = require('network-address');

/**
 * Global object with task meta
 * list -> list of available tasks
 *   -> port     // Port on which task is running on
 *   -> task_id  // Task UID
 *   -> pm2_name // Task PM2 application name
 *   -> path     // Task full path
 * port_offset -> port on which task LB has to listen to
 */
global._task_meta = {
  hostname       : os.hostname(),
  address        : address(),
  list           : {},
  port_offset    : 10001,
  is_file_master : false
};

if (require.main === module) {
  Intercom.API.expose({
    port : 10000
  });

  var network = new Intercom.network();
}

module.exports = Intercom;
