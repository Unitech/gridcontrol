

var client = require('../client').conf({
  task_folder : 'tasks',
  instances   : 2,
  env         : process.env
});

client.on('ready', function() {
  console.log('ready');
});
// Doing requests!

setInterval(function() {
  client.exec('echo', {
    name : 'hey'
  }, function(err, data) {
    console.log(data);
  });
}, 1000);

client.invoke('request-test', {
  url : 'https://keymetrics.io/'
}, function(err, data) {
  console.log(data);
});
