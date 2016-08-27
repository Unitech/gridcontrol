
const inquirer     = require('inquirer');
const fs           = require('fs');
const chalk        = require('chalk');
const shelljs      = require('shelljs');
const ora          = require('ora');
const Common       = require('../common.js');

/**
 * Init workflow
 *
 * 1/ Install PM2
 * 2/ Install Gridcontrol
 * 3/ Display hosts
 */
module.exports = function(grid_name) {
  // Welcome banner
  //var a = fs.readFileSync(__dirname + '/../pres/ascii2')
  //console.log(a.toString());
  new Promise((resolve, reject) => {
    // Determine grid name
    if (grid_name)
      return resolve(grid_name);
    return inquirer.prompt([{
      message :'Grid name?',
      type : 'input',
      name : 'grid_name'
    }]).then(answers => {
      return resolve(answers.grid_name);
    });
  }).then(function(grid_name) {
    // Install PM2
    console.log(chalk.bold('Initializing Grid: ' + grid_name));

    return new Promise((resolve, reject) => {
      var spinner = ora({
        text : chalk.bold('Installing Process Manager PM2 ') + chalk.italic('$ npm install pm2 -g'),
        spinner: 'arrow3'
      });

      spinner.start();

      if (shelljs.which('pm2')) {
        spinner.stop();
        return resolve(grid_name);
      }
      var cmd = 'npm install pm2 -g';

      shelljs.exec(cmd, { silent : true }, (code, stdout, stderr) => {
        spinner.stop();
        if (code != 0) return reject(stderr);
        return resolve(grid_name);
      });
    });

  }).then(function(grid_name) {
    // Install Gridcontrol
    return new Promise((resolve, reject) => {
      var spinner = ora({
        text : chalk.bold('Installing Network layer ') + chalk.gray.italic('($ pm2 install gridcontrol)'),
        spinner: 'arrow3'
      });

      spinner.start();
      var cmd = 'GRID=' + grid_name + ' pm2 install gridcontrol';

      shelljs.exec(cmd, {silent:true}, (code, stdout, stderr) => {
        spinner.stop();
        if (code != 0) return reject(stderr);
        return resolve();
      })
    });
  }).then(function() {
    setTimeout(function() {
      Common.displayHosts();
    }, 1200);
  }).catch(function(e) {
    console.error(chalk.bold.red('Error while initializing:'));
    console.error(e);
  });
}
