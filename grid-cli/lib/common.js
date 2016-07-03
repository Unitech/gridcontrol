
const grid  = require('grid-api');
const cliux = require('./cli-ux.js');
const path  = require('path');
const fs    = require('fs');

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
        return cb(new Error('Cannot connect to local gridcontrol, please install via `grid init`'));
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

exports.parseHostfile = function(hostfile) {
  return new Promise(function(resolve, reject) {
    fs.readFile(path.join(process.cwd(), hostfile), function(e, data) {
      if (e) return reject(e);
      var content = data.toString();
      var hosts = content.trim().split('\n');
      var ret_hosts = [];

      hosts.forEach((host) => {
        var ip = host.split(':')[1];
        var user = host.split(':')[0];

        ret_hosts.push({
          user : user,
          ip : ip
        });
      });

      resolve(hosts);
    });
  })
};
