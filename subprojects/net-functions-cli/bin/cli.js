#!/usr/bin/env node

var program      = require('commander');
var fs           = require('fs');
var path         = require('path');
var package      = require('../package.json');
var sshexec      = require('ssh-exec');
var chalk        = require('chalk');
var cliSpinners  = require('cli-spinners');
var async        = require('async');
var netfunctions = require('net-functions-api');
var cliux        = require('./cli-ux.js');

program
  .version(package.version);

/**
 * Customs
 */
program
  .description('List all peers connected to network')
  .option('--watch')
  .command('list-peers')
  .alias('ls')
  .action(function() {
    if (program.watch === true)
      cliux.displayHostsWatch();
    else
      netfunctions.listHosts(function(err, hosts) {
        if (err) return exitError(err);
        return cliux.displayHosts(hosts);
      });
  });

program
  .description('Provision a target ip with Node/PM2/net-functions')
  .command('provision <username> <ip> <namespace>')
  .action(function(username, ip, namespace) {
    var exec = require('child_process').exec;
    var strssh = username + '@' + ip;

    var child = exec('scp ' + __dirname + '/../install.sh ' + strssh + ':/tmp');

    child.stdout.on('data', function(data) {
      console.log('stdout: ' + data);
    });

    child.stderr.on('data', function(data) {
      console.log('stdout: ' + data);
    });

    child.on('close', function(code) {
      console.log('Copy done with code %d', code);
      //if (code == 0)
        //exitSuccess('Install script copy done');

      var stream = sshexec("PS1='$ ' source ~/.bashrc; cat /tmp/install.sh | NS=" + namespace + " bash", strssh);

      stream.on('data', function(dt) {
        process.stdout.write(dt.toString());
      });

      stream.on('error', function(e) {
        console.log('Got error', e.message || e);
      });

      stream.on('exit', function() {
        exitSuccess();
      });

    });
  });

program
  .description('List all peers connected to network')
  .command('invoke')
  .action(function() {

  });


/**
 * Generics
 */
program
  .command('*')
  .action(function(env){
    console.log('Enter a Valid command');
    program.outputHelp();
    process.exit(0);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

function exitError(err) {
  console.error(err);
  process.exit(1);
}

function exitSuccess(msg) {
  console.log(chalk.bold.green(msg || 'Action successfully executed'));
  process.exit(0);
}
