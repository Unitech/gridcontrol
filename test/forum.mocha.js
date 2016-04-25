
process.env.DEBUG = 'network';

var fs     = require('fs');
var path   = require('path');
var forum  = require('../forum/index.js');
var should = require('should');

describe('Forum tests', function() {
  var n1, n2;

  it('should communicate', function(done) {
    n1 = forum({
      namespace: process.pid + '-testing--'
    }, function(sock) {

      sock.on('data', function (data) {
        should(data.toString()).eql('+');
        done();
      });
    });

    setTimeout(function() {
      n2 = forum({
        namespace: process.pid + '-testing--'
      }, function(sock) {
        sock.write('+');
      });
    }, 200);
  });

  it('should close', function(done) {
    n1.close();
    n2.close();
    done();
  });

  it('should communicate with certificates', function(done) {
    var tls_cert = {
      key : fs.readFileSync(path.join(__dirname, 'fixtures/forum/private.key')),
      cert : fs.readFileSync(path.join(__dirname, 'fixtures/forum/public.crt'))
    };

    n1 = forum({
      namespace: process.pid + '-testing--',
      tls : tls_cert
    }, function(sock) {

      sock.on('data', function (data) {
        should(data.toString()).eql('+');
        done();
      });
    });

    setTimeout(function() {
      n2 = forum({
        namespace: process.pid + '-testing--',
        tls : tls_cert
      }, function(sock) {
        sock.write('+');
      });
    }, 200);
  });

  it('should close', function(done) {
    n1.close();
    n2.close();
    done();
  });

});
