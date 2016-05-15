
if (!process.env.DEBUG)
  process.env.DEBUG="api,network,tasks,filesmanager,tools,main,lb";

var GridControl = require('./src/');

if (require.main === module) {

  var Tools = require('./src/lib/tools.js');

  Tools.readConf(function(err, conf) {
    if (!conf) conf = {};

    if (process.env.GRID)
      conf.namespace = process.env.GRID;
    if (process.env.API_PORT)
      conf.peer_api_port = process.env.API_PORT;

    var grid = new GridControl(conf);
    grid.start();
  });
}

module.exports = GridControl;

module.exports.client = require('./grid-api/');
