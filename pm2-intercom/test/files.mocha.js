
var should          = require('should');
var path            = require('path');
var request         = require('request');
var constants       = require('../constants.js');
var FilesManagement = require('../files/management.js');
var fs              = require('fs');

// Expose sample server that exposes synchronized file
function sampleServer(cb) {
  var express    = require('express');
  var app  = express();

  app.get('/files/currentsync', function(req, res, next) {
    var sync = fs.createReadStream('./my-tarball.tar.gz');
    sync.pipe(res);
  });

  app.listen(10000, cb);
}

describe('Files', function() {
  before(function(done) {
    sampleServer(done);
  });

  it('should synchronize', function(done) {
    FilesManagement.synchronize('localhost', function() {
      done();
    });
  });

  it('should have the tarball existing', function(done) {
    fs.lstatSync(constants.TMP_FILE);
    done();
  });

  it('should have the tarball unzipped', function(done) {
    fs.lstatSync(constants.TMP_FOLDER);
    done();
  });

});
