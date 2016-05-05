
var grid = require('../../grid-api').init({
  task_folder : 'tasks',
  instances   : 2,
  env         : {
    NODE_ENV : 'development'
  }
});

grid.on('ready', function() {
  console.log('Ready');

  setInterval(function() {
    grid.dispatch('echo', {
      name : 'hey'
    }, function(err, data) {
      console.log(arguments);
    });
  }, 1000);

});

// Doing requests!
// grid.invoke('request-test', {
//   url : 'https://keymetrics.io/'
// }, function(err, data) {
//   //console.log(data);
// });
