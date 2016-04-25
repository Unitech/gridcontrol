
var client = require('./../../../client').conf({
  task_folder : 'tasks',
  instances   : 2,
  env         : process.env
});

client.on('ready', function() {
  console.log('ready');
});
// Doing requests!

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});

client.exec('echo', {
  name : 'hey'
}, function(err, data) {
  console.log(data);
});
