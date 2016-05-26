
module.exports = {
  TMP_FOLDER               : '/tmp/master/',
  TMP_FILE                 : '/tmp/sync.tar.gz',
  SYNC_FILE                : 'current-sync.tar.gz',
  TASK_FOLDER              : 'tasks',
  GRID_NAME                : 'pm2:fs',
  GRID_NAME_SUFFIX         : ':square-node:unik',
  FIND_SUITABLE_PEER_RETRY : 100,
  DISCOVERY_SETTINGS : {
    dns : {
      server : [
        'discovery1.publicbits.org',
        'discovery2.publicbits.org'
      ],
      interval : 1000
    },
    dht : false
  }
};
