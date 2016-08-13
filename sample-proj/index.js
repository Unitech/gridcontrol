
var grid = require('../grid-api/').init({
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
      if (err) console.log(err);
	    console.log('Got data', data);
	  });
  },1050);

  setInterval(function() {
    grid.exec('echo', {
      name : 'hey'
    }, function(err, data, server) {
	   // console.log(err, data, server && server.public_ip);
	    //console.log('Got response');
    });
  }, 1000);



});
