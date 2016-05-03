
var path            = require('path');
var request         = require('request');
var constants       = require('../src/constants.js');
var FilesManagement = require('../src/files/file_manager.js');
var Compress        = require('../src/files/compress.js');
var fs              = require('fs');
var Helper          = require('./helpers.js');
var should          = require('should');

var src_folder = path.join(__dirname, 'fixtures');
var dst_gzip   = path.join(__dirname, 'sync.tar.gz');

// Expose sample server that exposes synchronized file
function sampleServer(cb) {
  var express    = require('express');
  var app  = express();

  app.get('/files/get_current_sync', function(req, res, next) {
    var sync = fs.createReadStream(dst_gzip);
    sync.pipe(res);
  });

  app.listen(10000, function() {
    console.log('Compressing to %s', dst_gzip);
    Compress.pack(src_folder, dst_gzip, function(err) {
      if (err) console.error('WTF');
      cb();
    });
  });
}

describe('Files', function() {
  var file_manager_or;
  var file_manager_slave;
  var serial;

  before(function(done) {
    sampleServer(done);
  });

  it('should instanciate new file manager', function(done) {
    file_manager_or = new FilesManagement({
      dest_file   : '/tmp/nene.tar.gz',
      dest_folder : '/tmp/glouglou'
    });
    done();
  });

  it('should serialize file manager instance', function(done) {
    serial = file_manager_or.serialize();

    serial.should.have.properties(['dest_file', 'dest_folder', 'is_file_master']);
    done();
  });

  it('should reinstanciate a file manager', function(done) {
    file_manager_slave = new FilesManagement(serial);
    done();
  });


  it('should file manager be slave', function(done) {
    should(file_manager_slave.isFileMaster()).be.false;
    done();
  });

  it('should file manager has no file to sync', function() {
    should(file_manager_slave.hasFileToSync()).be.false;
  });

  it('should file path be right', function() {
    should(file_manager_slave.getFilePath()).eql('/tmp/glouglou');
  });

  it('should synchronize (get tarball + unzip)', function(done) {
    file_manager_slave.synchronize('localhost', 10000, function() {
      done();
    });
  });

  it('should synchronized file manager stay slave', function() {
    should(file_manager_slave.isFileMaster()).be.false;
  });

  it('should synchronized file manager has not file to sync', function() {
    should(file_manager_slave.hasFileToSync()).be.false;
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
    file_manager_slave.clear(done);
  });

  describe('master file manager', function() {
    it('should prepare sync of fixture app', function(done) {
      var base_folder = path.join(__dirname, 'fixtures', 'app1');
      file_manager_slave.prepareSync(base_folder, function(e) {
        done(e);
      });
    });

    it('should have master flags', function(done) {
      file_manager_slave.hasFileToSync().should.be.true;
      file_manager_slave.isFileMaster().should.be.true;
      done();
    });

    it('should have generated MD5', function(done) {
      file_manager_slave.getCurrentMD5().should.not.be.null;
      done();
    });
  });

});
