
var Compress = require('../src/files/compress.js');
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

  it('should fail on unknow error', function(done) {
    Compress.pack('/tmp/asdsad', dst_gzip)
      .catch(e => {
        should(e.code).eql('ENOENT')
        done();
      });
  });

  it('should pack folder', function() {
    return Compress.pack(src_folder, dst_gzip)
  });

  it('should unpack folder', function() {
    return Compress.unpack(dst_gzip, dst_folder);
  });

  it('should list same number of files', function(done) {
    var c1 = Helper.walkSync(dst_folder);
    var c2 = Helper.walkSync(src_folder);

    should(c1.length).eql(c2.length);
    done();
  });
});
