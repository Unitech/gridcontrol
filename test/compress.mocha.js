
var Compress = require('../lib/files/compress.js');
var path     = require('path');
var fs       = require('fs');

var Helper = require('./helpers.js');
var should = require('should');

var dst_folder = path.join(__dirname, 'fixtures_tmp');
var src_folder = path.join(__dirname, 'fixtures');
var dst_gzip   = path.join(__dirname, 'fixtures.tar.gz');

describe('Pack/Unpack folder', function() {
  after(function(done) {
    setTimeout(function() {
      Helper.rmdir(dst_folder,function(err,out) {
        fs.unlink(dst_gzip, function(e) {
          done();
        });
      });
    }, 100);
  });

  it.skip('should not fail on error', function(done) {
    Compress.pack('/tmp/asdsad', dst_gzip, function(err) {
      should(err).not.be.null;
      done();
    });
  });

  it('should pack folder', function(done) {
    Compress.pack(src_folder, dst_gzip, done);
  });

  it('should unpack folder', function(done) {
    Compress.unpack(dst_gzip, dst_folder, done);
  });

  it('should list same number of files', function(done) {
    var c1 = Helper.walkSync(dst_folder);
    var c2 = Helper.walkSync(src_folder);

    should(c1.length).eql(c2.length);
    done();
  });
});
