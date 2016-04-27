
var swarm = require('discovery-swarm')

var sw = swarm({
  dns : false
})
var os = require('os');

console.log('Registering to namespace %s', process.argv[2]);

sw.listen(10000)
sw.join(process.argv[2]) // can be any id/name/hash

sw.on('connection', function (connection) {
  console.log('found + connected to peer')

  connection.write(JSON.stringify({'hostname' : os.hostname()}));

  connection.on('data', function(data) {
    console.log(data.toString());
  });
})
