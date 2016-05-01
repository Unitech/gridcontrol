
var inquirer = require('inquirer');
var Table    = require('cli-table2');
var chalk = require('chalk');
var netfunctions = require('net-functions-api');

var CliUX = {};

CliUX.displayHosts = function(peers) {
  // instantiate
  var table = new Table({
    head: ['peer name', 'ip', 'API port', 'hostname', 'synchronized', 'namespace', 'files master', 'ssh'],
    style : {
      head : ['cyan', 'bold'],
      compact : true
    }
  });

  peers.forEach(function(server) {
    table.push([
      server.name,
      server.ip,
      server.api_port,
      server.hostname,
      server.synchronized,
      server.ns,
      server.files_master || false,
      'ssh ' + server.user + '@' + server.ip
    ]);
  });

  console.log(table.toString());
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
