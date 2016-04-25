
var should          = require('should');
var path            = require('path');
var request         = require('request');
var constants       = require('../constants.js');
var FilesManagement = require('../files/management.js');
var Compress        = require('../files/compress.js');
var fs              = require('fs');
var Helper          = require('./helpers.js');

var src_folder = path.join(__dirname, 'fixtures');
var dst_gzip   = path.join(__dirname, 'sync.tar.gz');

// Expose sample server that exposes synchronized file
function sampleServer(cb) {
  var express    = require('express');
  var app  = express();

  app.get('/files/currentsync', function(req, res, next) {
    var sync = fs.createReadStream(dst_gzip);
    sync.pipe(res);
  });

  app.listen(10000, function() {
    Compress.pack(src_folder, dst_gzip, cb);
  });
}

describe('Files', function() {
  var f_management;

  before(function(done) {
    f_management = new FilesManagement({
      dest_file   : '/tmp/nene.tar.gz',
      dest_folder : '/tmp/glouglou'
    });

    sampleServer(done);
  });

  after(function(done) {
    setTimeout(function() {
      fs.unlink(dst_gzip, function(e) {
        done();
      });
    }, 100);
  });

  it('should synchronize (get tarball + unzip)', function(done) {
    f_management.synchronize('localhost', 10000, function() {
      done();
    });
  });

  it('should have the tarball existing', function(done) {
    fs.lstatSync('/tmp/nene.tar.gz');
    done();
  });

  it('should have the tarball unzipped', function(done) {
    fs.lstatSync('/tmp/glouglou');
    done();
  });

  it('should clear all tmp files/folder', function(done) {
    f_management.clear(done);
  });

});
