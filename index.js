
var Mastercom = require('./mastercom');

var mastercom = new Mastercom({
  base_port : 10000
});

mastercom.on('pm2:connected', function() {
  console.log('Connected to PM2' );
});


// console.log(mastercom);
// mastercom.tasks(function(err, tasks) {
//   console.log(tasks);
// });

// mastercom.exec('request-test.js', {
//   url : 'https://app.keymetrics.io/api/misc/pm2_version'
// }, function(err, result) {
//   console.log(arguments);
// });
