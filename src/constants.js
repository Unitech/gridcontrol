const path            = require('path');

module.exports = {
  TMP_FOLDER               : '/tmp/master/',
  TMP_FILE                 : '/tmp/sync.tar.gz',
  SYNC_FILE                : 'current-sync.tar.gz',
  TASK_FOLDER              : 'tasks',
  GRID_NAME                : 'pm2:fs',
  GRID_NAME_SUFFIX         : ':square-node:unik',
  CONF_FILE                : path.join(__dirname, 'conf.json'),
  FIND_SUITABLE_PEER_RETRY : 100,
  REMOTE_REQUEST_TIMEOUT   : 60 * 1000,
  IGNORE_FILE              : '.gridignore',
  DNS_DISCOVERY : [
    'discovery1.publicbits.org',
    'discovery2.publicbits.org'
  ]
};
