
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
	  grid.dispatch('request-test', {
	    url : 'https://api.ipify.org/?format=json'
	  }, function(err, data) {
	    console.log('Got data', data);
	  });
  }, 250);

  setInterval(function() {
    grid.dispatch('echo', {
      name : 'hey'
    }, function(err, data) {
	    //console.log(arguments);
	    //console.log('Got response');
    });
  }, 100);

});
