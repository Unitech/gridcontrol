
process.env.DEBUG="api,network,tasks,filesmanager,tools";

var GridControl = require('./src/gridcontrol.js');

if (require.main === module) {

  //var Tools = require('./src/tools.js');
  //Tools.serializeToFile();

  new GridControl({
    peer_api_port : process.env.API_PORT || process.argv[2] || 10000
  });
}

module.exports = GridControl;
