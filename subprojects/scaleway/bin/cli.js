#!/usr/bin/env node

// https://developer.scaleway.com/#snapshots-snapshots

var program  = require('commander');
var fs       = require('fs');
var path     = require('path');
var package  = require('../package.json');
var Scaleway = require('../index.js');

var conf_file = path.join(process.env.HOME, '.scaleway');
var token     = '';

try {
  token = fs.readFileSync(conf_file).toString().trim();
} catch(e) {
  console.error('Please put access token (fromhttps://cloud.scaleway.com/#/credentials) in file in %s', conf_file);
  process.exit(1);
}

var scaleway = new Scaleway(token);

// CLI opts
program
  .version(package.version);

program
  .command('server:list')
  .description('list servers')
  .alias('ls')
  .action(function() {
    scaleway.listServers(function(err, data) {
      listServers(data.servers, function() {
        console.log(arguments);
      });
    });
  })

program
  .command('stop <hostname>')
  .description('stop hostname')
  .action(function(hostname) {
    scaleway.stopServer(hostname, function(err, data) {
      console.log(data);
    });
  })

program
  .command('server:action <hostname>')
  .description('list server actions')
  .action(function(hostname) {
    scaleway.listActions(hostname, function(err, data) {
      console.log(data);
    });
  })


program
  .command('snapshots:list')
  .alias('snap')
  .action(function() {
    scaleway.listSnapshots(function(err, data) {
      listSnap(data);
    });
  })

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

scaleway.init(function() {
  program.parse(process.argv);
});

function listSnap(servers) {
  var json_tb = require('json-table');

  new json_tb(servers, function(table) {
    table.show();
  });
}

function listServers(servers) {
  var Table = require('cli-table2');

  // instantiate
  var table = new Table({
    head: ['hostname', 'state', 'public ip', 'private ip', 'image', 'ssh']
  });

  servers.forEach(function(server) {
    table.push([
      server.hostname,
      server.state,
      server.public_ip.address,
      server.private_ip,
      server.image.name,
      'ssh root@' + server.public_ip.address
    ]);
  })

  console.log(table.toString());
}
