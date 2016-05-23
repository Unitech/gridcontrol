
const grid         = require('grid-api');
const cliux        = require('../bin/cli-ux.js');

function exitError(err) {
  console.error(err);
  process.exit(1);
}

exports.displayHosts = function displayHosts(cb) {
  var retry_count = 0;

  if (!cb) {
    cb = (e) => {
      if (e) {
        console.error(e);
        process.exit(1);
        return;
      }
      process.exit(0);
    }
  }

  function disp(cb) {
    grid.listHosts(function(err, hosts) {
      if (err) return cb(new Error('cannot connect'));
      return cliux.displayHosts(hosts, cb);
    });
  }

  function retry() {
    setTimeout(function() {
      retry_count++;

      if (retry_count > 20) {
        return cb(new Error('Cannot connect to local gridcontrol'));
      }
      disp(function(err) {
        if (!err)
          return setTimeout(function() { cb() }, 150);
        return retry();
      });
    }, 200);
  }

  disp(function(err) {
    if (err) return retry();
    return setTimeout(function() { cb() }, 150);
  });
};
