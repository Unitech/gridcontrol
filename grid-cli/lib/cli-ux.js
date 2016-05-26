
var inquirer     = require('inquirer');
var Table        = require('cli-table2');
var chalk        = require('chalk');
var netfunctions = require('grid-api');

var CliUX = {};

CliUX.status = function(peers) {
}

CliUX.displayHosts = function(peers, cb) {
  // instantiate
  var table = new Table({
    head: ['peer name', 'public ip', 'private ip', 'grid version', 'hostname', 'synchronized', 'namespace', 'files master', 'ssh'],
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
      server.files_master || false,
      'ssh ' + server.user + '@' + server.public_ip
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
