#!/usr/bin/env node

// https://developer.scaleway.com/#snapshots-snapshots

var program  = require('commander');
var fs       = require('fs');
var path     = require('path');
var package  = require('../package.json');
var Scaleway = require('../index.js');
var sshexec  = require('ssh-exec');
var Icli     = require('../interactive-cli.js');
var chalk    = require('chalk');
var cliSpinners = require('cli-spinners');
var async = require('async');

var conf_file = path.join(process.env.HOME, '.scaleway');
var token     = '';

try {
  token = fs.readFileSync(conf_file).toString().trim();
} catch(e) {
  console.error('Please put access token (from https://cloud.scaleway.com/#/credentials) in file in %s', conf_file);
  process.exit(1);
}

var scaleway = new Scaleway(token);
var icli     = new Icli(scaleway);

// CLI opts
program
  .version(package.version);

program
  .description('list-servers')
  .option('--watch')
  .command('server-list')
  .alias('ls')
  .action(function() {
    if (program.watch === true)
      icli.watchListServers();
    else
      listServers();
  });

program
  .command('stop [hostname]')
  .description('stop hostname')
  .action(function(hostname) {

    function act(hostname) {
      scaleway.actionServer(hostname, 'poweroff', function(err, data) {
        if (err) return exitError(err);
        return success();
      });
    }

    if (!hostname) {
      icli.chooseHostname(act);
      return false;
    }
    return act(hostname);
  });

program
  .command('start [hostname]')
  .description('start [hostname]')
  .action(function(hostname) {
    function act(hostname) {
      scaleway.actionServer(hostname, 'poweron', function(err, data) {
        if (err) return exitError(err);
        return success();
      });
    }

    if (!hostname) {
      icli.chooseHostname(act);
      return false;
    }
    return act(hostname);
  });

program
  .command('ssh')
  .description('ssh to hostname')
  .action(function(hostname) {
    function act(hostname) {
      const spawn = require('child_process').spawn;

      scaleway.getServerMetaFromHostname(hostname, function(err, meta) {
        var con = 'root@' + meta.public_ip.address;
        console.log('Executing command: ssh %s', con);
        spawn('ssh', [con], {
          stdio : 'inherit'
        });
      });
    }

    icli.chooseHostname(act);
  });

program
  .command('sshall <cmd> [parallel]')
  .description('ssh to each online host and execute <cmd>')
  .action(function(cmd, parallel) {

    async.forEachLimit(scaleway.server_list, parallel || 1, function(server, next) {
      if (server.state == 'running') {
        console.log('Execting command "%s" on server [%s]', cmd, server.hostname);
        var stream = sshexec("PS1='$ ' source ~/.bashrc;" + cmd, 'root@' + server.public_ip.address);

        stream.on('data', function(dt) {
          console.log(dt.toString());
        });

        stream.on('error', function(e) {
          console.log('Got error', e.message || e);
        });

        stream.on('exit', function() {
          next();
        });
      }
      else next();

    }, function() {
      console.log(chalk.green.bold('Done.'));
      process.exit(0);
    });
  });

program
  .command('terminate <hostname>')
  .description('terminate <hostname>')
  .action(function(hostname) {
    function act(hostname) {
      scaleway.actionServer(hostname, 'terminate', function(err, data) {
        if (err) return exitError(err);
        return success();
      });
    }

    if (!hostname) {
      icli.chooseHostname(act);
      return false;
    }
    return act(hostname);
  });

program
  .command('snapshot-list')
  .alias('snap')
  .action(function() {
    scaleway.listSnapshots(function(err, data) {
      listSnap(data);
    });
  });

program
  .command('snapshot-list')
  .alias('snap')
  .action(function() {
    scaleway.listSnapshots(function(err, data) {
      listSnap(data);
    });
  });

program
  .command('*')
  .action(function(env){
    console.log('Enter a Valid command');
    program.outputHelp();
    process.exit(0);
  });

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

var ora = require('ora');
var spinner = ora({
  text : chalk.bold('Loading server list'),
  spinner: 'arrow3'
});

// connecting= earth
//arrow3

spinner.start();
scaleway.init(function() {
  spinner.stop();
  program.parse(process.argv);
});

/**
 * CLI commands
 */
function exitError(err) {
  console.error(err);
  process.exit(1);
}

function formatResponse(data) {
  console.log(data);
}

function success() {
  console.log(chalk.bold.green('Action successfully executed'));
  process.exit(0);
}

function listSnap(snapshots) {
  console.log(snapshots);
}

function listServers(servers) {
  icli.listServers();
  process.exit(0);
}
