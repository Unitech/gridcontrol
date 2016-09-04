
var inquirer     = require('inquirer');
var Table        = require('cli-table2');
var chalk        = require('chalk');
var netfunctions = require('grid-api');

var CliUX = {};

CliUX.chooseHostname = function(servers, cb) {
  var hostnames = [];

  servers.forEach(function(server) {
    hostnames.push(server.ip + ' ' + server.user);
  });

  inquirer.prompt({
    type: 'list',
    name: 'server',
    message: 'Which server?',
    choices: hostnames,
    filter : function(server) {
      return { ip : server.split(' ')[0], user : server.split(' ')[1] };
    }
  }).then(function (answers) {
    cb(answers.server);
  });

};

CliUX.displayHosts = function(peers, cb) {
  // instantiate
  var table = new Table({
    head: ['peer name', 'public ip', 'private ip', 'grid version', 'hostname', 'synchronized', 'namespace', 'files master'],
    style : {
      head : ['cyan', 'bold'],
      border : ['cyan'],
      compact : true
    }
  });

  peers.forEach(function(server) {
    table.push([
      server.name,
      server.public_ip,
      server.private_ip,
      server.grid_version,
      server.hostname,
      (!server.files_master ? (server.synchronized ? chalk.bold.green("true") : chalk.bold.yellow("false")) : chalk.bold("master")),
      server.ns,
      server.files_master || false
    ]);
  });

  console.log(table.toString());
  if (peers[0]) {
    console.log(chalk.bold('Grid name: ') + chalk.bold.blue(peers[0].ns));
  }

  setTimeout(cb, 70);
};

CliUX.displayHostsWatch = function(peers) {
  var clear = require('clear');
  var that = this;

  function display() {
    clear();
    netfunctions.listHosts(function(err, hosts) {
      that.displayHosts(hosts);
    });
  }
  setInterval(display, 1000);
  display();

};

module.exports = CliUX;
