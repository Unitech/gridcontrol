
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

exports.generateGridfile = function(target_path) {
  return new Promise((resolve, reject) => {
    var gridfile_tpl = path.join(__dirname, 'template', 'Gridfile.tpl');
    var target_file  = path.join(target_path, 'Gridfile')
    fs.readFile(gridfile_tpl, function(err, template) {
      if (err) return reject(err);
      fs.writeFile(target_file, template, (err) => {
        if (err) return reject(err);
        return resolve({ file : template, file : target_file});
      });
    });
  });
};

exports.updateGridfile = function(gridfile_path) {
  // 1# Parse old Gridfile
  return parseGridfile(gridfile_path)
    .then((file) => {
      // 2# List current hosts
      return new Promise((resolve, reject) => {
        grid.listHosts(function(err, hosts) {
          if (err) return resolve(err);
          return resolve({ hosts: hosts, gridfile : file});
        });
      });
    })
    .then((data) => {
      // 3# Update Gridfile with current hosts + grid name
      var gridfile = data.gridfile;
      var current_servers = data.hosts;

      gridfile.servers = [];

      gridfile.grid_name = current_servers[0].ns;

      current_servers.forEach(function(server) {
        gridfile.servers.push({
          user : server.user,
          ip   : server.public_ip
        });
      });

      return saveGridfile(gridfile_path, gridfile);
    })
};

function saveGridfile(conf_path, gridfile_obj) {
  return new Promise((resolve, reject) => {
    var new_gridfile = {};

    new_gridfile = JSON.parse(JSON.stringify(gridfile_obj));

    new_gridfile.servers = [];

    gridfile_obj.servers.forEach(function(c, i) {
      new_gridfile.servers.push(c.user + '@' + c.ip);
    });

    fs.writeFile(conf_path, toml.dump(new_gridfile), (err) => {
      if (err) reject(err);
      return resolve({new_gridfile : new_gridfile, file : conf_path});
    })
  });
};

function parseGridfile(conf_path) {
  return new Promise((resolve, reject) => {

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

exports.parseGridfile = parseGridfile;
