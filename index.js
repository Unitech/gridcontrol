
process.env.DEBUG="api,network,tasks,filesmanager,tools,main,lb";

var GridControl = require('./src/');

if (require.main === module) {

  //var Tools = require('./src/tools.js');
  //Tools.serializeToFile();

  var grid = new GridControl({
    peer_api_port : process.env.API_PORT || process.argv[2] || 10000
  });

  grid.start();
}

module.exports = GridControl;
