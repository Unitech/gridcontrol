
var debug      = require('debug')('files:controller');
var fs = require('fs');

var Controller = module.exports = {
  get_current_sync : function(req, res, next) {
    var sync = fs.createReadStream('./my-tarball.tar.gz');

    sync.on('open', function() {
      sync.pipe(res);
    });

    sync.on('error', function(e) {
      res.end(e);
    });
  }
};
