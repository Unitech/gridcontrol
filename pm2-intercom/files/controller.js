
var debug     = require('debug')('files:controller');
var fs        = require('fs');
var constants = require('../constants.js');

var Controller = module.exports = {
  get_current_sync : function(req, res, next) {
    var sync = fs.createReadStream(constants.SYNC_FILE);

    sync.on('open', function() {
      sync.pipe(res);
    });

    sync.on('error', function(e) {
      res.end(e);
    });
  }
};
