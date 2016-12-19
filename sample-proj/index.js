
var grid = require('../grid-api/').init({
  task_folder : 'tasks',
  instances   : 1,
  local : false,
  env         : {
    NODE_ENV : 'development'
  }
});

grid.on('ready', function() {
  console.log('Ready');

  // setInterval(function() {
	//   grid.dispatch('request-test', {
	//     url : 'https://api.ipify.org/?format=json'
	//   }, function(err, data, server) {
  //     if (err) {
  //       console.log('Fuck got error');
  //       console.log(err, server.public_ip);
  //       return false;
  //     }
	//     console.log('Got data', data);
	//   });
  // },1050);


  setInterval(function() {
    grid.exec('my-ip', function(err, data, server) {
      if (err) return console.log(err);
	   // console.log(err, data, server && server.public_ip);
	    console.log('Got response', data, server.public_ip, server.private_ip);
    });
  }, 1000);
});
