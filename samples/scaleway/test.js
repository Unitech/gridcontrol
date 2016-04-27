
var Scaleway = require('./index.js');

var scaleway = new Scaleway('8fad00b4-ab78-4363-b5ab-f995cf97ee4a');

scaleway.listServers(function(err, data) {
  console.log(err, data);
});
