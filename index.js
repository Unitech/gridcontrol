
process.env.DEBUG="api,network,tasks,filesmanager";

var Intercom = require('./src/gridcontrol.js');

if (require.main === module) {
  new Intercom({
    peer_api_port : process.env.API_PORT || process.argv[2] || 10000
  });
}

module.exports = Intercom;
