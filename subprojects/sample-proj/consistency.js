

var grid = require('../../grid-api').init({
  task_folder : 'tasks',
  instances   : 2,
  env         : {
    NODE_ENV : 'development'
  }
});

var i = 0;

grid.on('ready', function() {
  setInterval(function() {
	  grid.dispatch('consistency.stateful', i++ , function(err, data, server) {
	    console.log('Got data', data, server.public_ip);
	  });
  }, 1000);
});
