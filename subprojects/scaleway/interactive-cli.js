
var inquirer = require('inquirer');
var Table    = require('cli-table2');
var chalk = require('chalk');

var ICLI = function(scaleway) {
  this.scaleway = scaleway;
};

module.exports = ICLI;

function colorStatus(state) {
  if (state == 'running')
    return chalk.bold.green(state);
  if (state == 'stopped')
    return chalk.bold.red(state);
  if (state == 'starting')
    return chalk.bold.blue(state);
  if (state == 'stopping')
    return chalk.bold.yellow(state);
  return state;
}

ICLI.prototype.chooseHostname = function(cb) {
  var hostnames = [];

  this.scaleway.server_list.forEach(function(server) {
    hostnames.push(server.hostname + ' <ip=' + server.public_ip.address + '> <status=' + colorStatus(server.state) + '>');
  });

  inquirer.prompt({
    type: 'list',
    name: 'server',
    message: 'Which server?',
    choices: hostnames,
    filter : function(server) {
      // Return server hostname only
      return server.split(' ')[0];
    }
  }).then(function (answers) {
    cb(answers.server);
  });
};

ICLI.prototype.watchListServers = function() {
  var clear = require('clear');
  var that = this;

  function display() {
    clear();
    that.listServers();
    var time = new Date();
    console.log('Refresh time %s', time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds());
  }

  (function rec() {
    that.scaleway.init(function() {
      display();
      setTimeout(rec, 500);
    });
  })();

  display();
};

ICLI.prototype.listServers = function() {
  // instantiate
  var table = new Table({
    head: ['hostname', 'state', 'public ip', 'private ip', 'image', 'ssh'],
    style : {
      head : ['cyan', 'bold'],
      compact : true
    }
  });

  this.scaleway.server_list.forEach(function(server) {
    table.push([
      server.hostname,
      colorStatus(server.state),
      server.public_ip.address,
      server.private_ip,
      server.image.name,
      'ssh root@' + server.public_ip.address
    ]);
  });

  console.log(table.toString());
};
