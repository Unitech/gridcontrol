
process.env.DEBUG='network';

var network = require('../index.js').network;
var should  = require('should');
var path    = require('path');
var request = require('request');

describe('Network', function() {
  var n1, n2, n3;

  it('should handle connections', function(done) {
    n1 = new network(done);
  });

  it('should connect second client', function(done) {
    n2 = new network(done);
  });

  it('n1 should list 1 peer', function(done) {
    should(n1.getPeers().length).eql(1);
    done();
  });

  it('n2 should list 1 peer', function(done) {
    should(n2.getPeers().length).eql(1);
    done();
  });
});
