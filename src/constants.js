const path            = require('path');

var getDefaultPM2Home = function() {
  var PM2_ROOT_PATH;

  if (process.env.PM2_HOME)
    PM2_ROOT_PATH = process.env.PM2_HOME;
  else if (process.env.HOME && !process.env.HOMEPATH)
    PM2_ROOT_PATH = path.resolve(process.env.HOME, '.pm2');
  else if (process.env.HOME || process.env.HOMEPATH)
    PM2_ROOT_PATH = path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, '.pm2');
  else {
    PM2_ROOT_PATH = path.resolve('/etc', '.pm2');
  }
  return PM2_ROOT_PATH;
}

module.exports = {
  TMP_FOLDER               : '/tmp/master/',
  TMP_FILE                 : '/tmp/sync.tar.gz',
  SYNC_FILE                : 'current-sync.tar.gz',
  TASK_FOLDER              : 'tasks',
  GRID_NAME                : 'pm2:fs',
  GRID_NAME_SUFFIX         : ':square-node:unik',
  CONF_FILE                : path.join(getDefaultPM2Home(), 'gridcontrol.json'),
  FIND_SUITABLE_PEER_RETRY : 100,
  REMOTE_REQUEST_TIMEOUT   : 60 * 1000,
  IGNORE_FILE              : '.gridignore',
  DNS_DISCOVERY : [
    'discovery1.publicbits.org',
    'discovery2.publicbits.org'
  ]
};
