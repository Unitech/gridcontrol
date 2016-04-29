
process.env.DEBUG="api,network";

var Intercom = require('./lib/cloudfunctions.js');

if (require.main === module) {
  new Intercom({
    peer_api_port : process.argv[2] || 10000
  });
}

module.exports = Intercom;
