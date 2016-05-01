#!/usr/bin/env node

var program     = require('commander');
var fs          = require('fs');
var path        = require('path');
var package     = require('../package.json');
var sshexec     = require('ssh-exec');
var chalk       = require('chalk');
var cliSpinners = require('cli-spinners');
var async       = require('async');
var netfunctions = require('net-functions-api');

program
  .version(package.version);

/**
 * Customs
 */
program
  .description('List all peers connected to network')
  .command('list-peers')
  .alias('ls')
  .action(function() {
    netfunctions.listHosts(function(err, tasks) {
      console.log(err, tasks);
    });
  });

program
  .description('List all peers connected to network')
  .command('provision')
  .action(function() {

  });

program
  .description('List all peers connected to network')
  .command('ssh')
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

function exitSuccess() {
  console.log(chalk.bold.green('Action successfully executed'));
  process.exit(0);
}
