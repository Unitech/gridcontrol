
var should = require('should');
var Tools  = require('../src/lib/tools.js');
var fs     = require('fs');
var path   = require('path');

describe('Tools test', function() {
  after(function() {
    fs.unlinkSync(path.join(process.cwd(), 'test.tmp'));
  });

  it('should write JSON conf', function(done) {
    Tools.writeConf('test.tmp', { hey : "hay", o : { ol : "wda" } }, function(e) {
      should(e).be.null();
      done();
    });
  });

  it('should read JSON conf', function(done) {
    Tools.readConf('test.tmp', function(e, opts) {
      should(e).be.null();
      opts.hey.should.eql('hay');
      opts.o.ol.should.eql('wda');
      done();
    });
  });
});
