
process.env.DEBUG="api,network,tasks";

var Intercom = require('./src/netfunctions.js');

if (require.main === module) {
  new Intercom({
    peer_api_port : process.env.API_PORT || process.argv[2] || 10000
  });
}

module.exports = Intercom;
