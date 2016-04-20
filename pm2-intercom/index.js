

var Network = require('./network.js');

if (require.main === module) {
  new Network({
    peer_api_port : 10000
  });
}

module.exports = Network;
