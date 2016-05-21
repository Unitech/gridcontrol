
var grid = require('.');

grid.init({
  task_folder : 'tasks',
  instances : 1
});

// grid.on('error', e => {
//   console.log(e);
// });

// function exec() {
//   console.log('executing');

//   grid.dispatch('scrap', {
//   }, function(err, data, server) {
//     if (err) console.log(err);
//     console.log(err, data, server.public_ip);
//     setTimeout(exec, 100);
//   })
// }

// grid.on('ready', function() {
//   console.log('ready');
//   exec();
// });
