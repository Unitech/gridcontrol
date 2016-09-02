'use strict';

const async        = require('async');
const fs           = require('fs');
const path         = require('path');
const chalk        = require('chalk');
const shelljs      = require('shelljs');
const keygen       = require('ssh-keygen2');
const exec         = require('child_process').exec;
const sshexec      = require('ssh-exec');
const Common       = require('../common.js');

var SSH = {
  /**
   * Use the utility `ssh-copy-id` to copy local public key to
   * remote server
   *
   * @param {String} hostfile file containing a list of server (format: user:ip)
   * @param {String} [custom_key="$HOME/.ssh/id_rsa.pub"] optionnal path of a custom ssh key
   */
  copy_public_key : function(conf, custom_key) {
    return new Promise((resolve, reject) => {
      var ret = [];

      var ssh_copy_id = path.join(__dirname, '..', 'ssh-copy-id');

      async.forEachLimit(conf.servers, 1, (server, next) => {
        console.log(chalk.blue.bold('===> Copying key to : %s@%s'),
                    server.user,
                    server.ip);

        var cmd = ssh_copy_id;

        if (custom_key)
          cmd += ' -i ' + custom_key;

        cmd += ' -o "StrictHostKeyChecking no" -o "CheckHostIP=no"';
        cmd += ' ' + server.user + '@' + server.ip;

        console.log(cmd);
        ret.push(cmd);

        var timer = setTimeout(() => {
          console.error(chalk.bold.red('Host %s@%s does not look online'), server.user, server.ip);
          next();
        }, 25000);

        shelljs.exec(cmd, function(code, stdout, stderr) {
          clearTimeout(timer);
          next();
        });
      }, e => {
        if (e) return reject(e);
        return resolve(ret);
      });
    });
  },
  copy_install_script : function(server, conf) {
    return new Promise((resolve, reject) => {
      var scp_copy_command;
      var local_install_script = path.join(__dirname, '../install.sh');

      var strssh = server.user + '@' + server.ip;

      if (conf.ssh_key)
        scp_copy_command = 'scp -o ConnectTimeout=10  -i ' + conf.ssh_key + ' ' + local_install_script + ' ' + strssh + ':/tmp';
      else
        scp_copy_command = 'scp -o ConnectTimeout=10  ' + local_install_script + ' ' + strssh + ':/tmp';

      console.log(chalk.bold('Copying install script:'),
                  chalk.italic.grey(scp_copy_command));

      shelljs.exec(scp_copy_command, function(code, stdout, stderr) {
        if (code != 0) return reject(new Error(stderr));
        console.log(chalk.bold.green('✓ Install script copied successfully on server %s'), server.ip);
        return resolve();
      });
    })
  },
  /**
   * Provision a node via SSH
   * 1/ SCP the local install.sh script
   * 2/ Run install.sh (install Node.js+PM2+Gridcontrol)
   *
   * @param {Object} server
   * @param {Object} server.ip
   * @param {Object} server.name
   * @param {Object} [server.ssh_key=null]
   * @param {Object} conf
   * @param {Object} conf.ssh_key
   * @param {Object} conf.grid_name
   * @param {Object} conf.grid_password
   * @param {Object} conf.keymetrics_public
   * @param {Object} conf.keymetrics_private
   */
  provision_target : function(server, conf) {
    return this.copy_install_script(server, conf)
      .then((resolve, reject) => {
        //@todo add keymetrics_public + keymetrics_secret
        var cmd = "PS1='$ ' source ~/.bashrc; cat /tmp/install.sh | GRID=" + conf.grid_name + " GRID_AUTH=" + conf.grid_password + " bash"

        var ssh_opts = {
          user : server.user,
          host : server.ip
        };

        if (server.ssh_key)
          ssh_opts.key = server.ssh_key;
        else if (conf.ssh_key)
          ssh_opts.key = conf.ssh_key;

        console.log(chalk.bold('Connecting to remote and starting install script'));

        var stream = sshexec(cmd, ssh_opts);

        stream.on('data', function(dt) {
          process.stdout.write(dt.toString());
        });

        stream.on('warn', function(dt) {
          process.stderr.write(dt.toString());
        });

        stream.on('error', function(dt) {
          reject(dt);
        });

        stream.on('exit', function(e) {
          resolve(e)
        });
      });
  },
  generate_keypair : function(_opts) {
    return new Promise((resolve, reject) => {
      if (!_opts) _opts = {};

      var opts = {
        type    : 'rsa',
        bits    : _opts.bits || 1024,
        comment : 'grid-keys'
      };

      keygen(opts, function (err, keypair) {
        if (err) return reject(err);
        return resolve(keypair);
      });
    });
  }
};

module.exports = SSH;
