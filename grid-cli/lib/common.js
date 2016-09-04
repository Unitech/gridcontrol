
const grid    = require('grid-api');
const cliux   = require('./cli-ux.js');
const path    = require('path');
const fs      = require('fs');
const toml    = require('toml-js');
const SSH     = require('./workflows/ssh.js');
const os      = require('os');
const crypto  = require('crypto');
const Moniker = require('moniker');

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

exports.generateGridfileSSH = function(target_path) {
  return new Promise((resolve, reject) => {
    var gridfile_tpl = path.join(__dirname, 'template', 'Gridfile.tpl');
    var target_file  = path.join(target_path, 'Gridfile')
    fs.readFile(gridfile_tpl, function(err, template) {
      if (err) return reject(err);

      SSH.generate_keypair({bits:1024})
        .then((keypair) => {
          template = template.toString();
          var rd = crypto.randomBytes(4).readUInt32LE(0);
          template = template.replace('%GRID_NAME%', Moniker.choose());
          template = template.replace('%GRID_PASSWORD%', rd);
          template = template.replace('%SSH_SECRET%', keypair.private);
          template = template.replace('%SSH_PUBLIC%', keypair.public);

          fs.writeFile(target_file, template, (err) => {
            if (err) return reject(err);
            return resolve({ file : template, file : target_file});
          });
        })
        .catch((e) => {
          console.trace(e);
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

function parseGridfile(conf_path, opts) {
  opts = opts || {};

  return new Promise((resolve, reject) => {
    var toml = require('toml');

    fs.readFile(conf_path, function(e, data) {
      if (e) return reject(e);

      try {
        var conf = toml.parse(data.toString());
      } catch(e) {
        return reject(e);
      }

      var servers = [];

      conf.servers.forEach(function(c) {
        var user = c.split('@')[0];
        var ip   = c.split('@')[1];

        if (opts.only && opts.only != ip) return;
        servers.push({
          user : user,
          ip   : ip
        });
      });

      if (servers.length == 0)
        return reject(new Error('Not any IP found for this "only" value'));

      conf.servers = servers;

      if (conf.ssh_key.length > 30) {
        // Embedded SSH Key
        var rd = crypto.randomBytes(4).readUInt32LE(0);
        var filename_pr = 'gb' + conf.grid_name;
        var filename_pb = 'gb' + conf.grid_name + '.pub';
        var tmp_file_pr = path.join(os.tmpdir(), filename_pr);
        var tmp_file_pb = path.join(os.tmpdir(), filename_pb);
        try {
          fs.unlinkSync(tmp_file_pr);
          fs.unlinkSync(tmp_file_pb);
        } catch(e) {}
        fs.writeFileSync(tmp_file_pr, conf.ssh_key);
        fs.writeFileSync(tmp_file_pb, conf.ssh_public_key);
        fs.chmodSync(tmp_file_pr, '400');
        fs.chmodSync(tmp_file_pb, '400');
        conf.ssh_key = tmp_file_pr;
        conf.ssh_public_key = tmp_file_pb;
      }

      return resolve(conf);
    });
  });
};

exports.parseGridfile = parseGridfile;
