
const grid  = require('grid-api');
const cliux = require('./cli-ux.js');
const path  = require('path');
const fs    = require('fs');
const toml  = require('toml-js');

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

exports.parseGridfile = function(gridfile) {
  return new Promise((resolve, reject) => {
    var conf_path = path.join(process.cwd(), gridfile);

    fs.readFile(conf_path, function(e, data) {
      if (e) return reject(e);

      try {
        var conf = toml.parse(data.toString());
      } catch(e) {
        return reject(e);
      }

      conf.servers.forEach(function(c, i) {
        conf.servers[i] = {};
        conf.servers[i].user = c.split('@')[0];
        conf.servers[i].ip   = c.split('@')[1];
      });

      return resolve(conf);
    });
  });
};
