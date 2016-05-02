
var client = require('../net-functions-api').conf({
  task_folder : 'tasks',
  instances   : 2,
  env         : {
    NODE_ENV : 'development'
  }
});

client.on('ready', function() {
  console.log('Ready');

  client.exec('echo', {
    name : 'hey'
  }, function(err, data) {
    console.log(err, data);
  });

  setInterval(function() {
    client.exec('echo', {
      name : 'hey'
    }, function(err, data) {
      console.log(data);
    });
  }, 1000);

});

// Doing requests!
// client.invoke('request-test', {
//   url : 'https://keymetrics.io/'
// }, function(err, data) {
//   //console.log(data);
// });
