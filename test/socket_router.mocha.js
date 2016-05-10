
var socketrouter = require('../src/lib/socket_router.js');
var net = require('net');
var should = require('should');

describe('Socket Router LIB', function() {
  var server;
  var r1, s1;
  var pool = [];

  before(function(done) {
    server = net.createServer(function(socket) {
      var c = socketrouter(socket);

      c.mount('welcome', { im : 'theserver' });

      pool.push(c);
    });
    server.listen(8888, done);
  });

  it('should create a socket and connect server', function(done) {
    s1 = new net.Socket();
    s1.on('connect', done);
    s1.connect(8888);
  });

  it('should wrap socket into router', function() {
    r1 = socketrouter(s1);
    r1.should.have.properties([
      'uuid',
      'socket',
      '_route_table',
      '_rpc_calls'
    ]);
  });

  it('should mount routes', function() {
    r1.mount('t1', function(data) {
      console.log(data);
    });

    r1.mount('t2', function(data) {
      console.log(data);
    });

    r1._route_table.should.have.properties(['t1', 't2']);
  });

  it('should mount route and be able to trigger from server', function(done) {
    r1.mount('t3', done);
    pool[0].send('t3');
  });

  describe('RPC', function() {
    it('should mount RPC route and call it from server', function(done) {
      r1.mount('t4rpc', function(data, cb) {
        Object.keys(pool[0]._rpc_calls).length.should.eql(1);
        should(data.curr).eql('data');
        cb(null, {success:true});
      });

      pool[0].send('t4rpc', { curr : 'data' }, function(err, ret) {
        should(err).be.null;
        ret.success.should.be.true;
        setTimeout(function() {
          Object.keys(pool[0]._rpc_calls).length.should.eql(0);
          done();
        }, 20);
      });
    });

    it('should mount ERRORED RPC ROUTE', function(done) {
      r1.mount('t5rpc', function(data, cb) {
        cb(new Error('error hehe'));
      });

      pool[0].send('t5rpc', { curr : 'data' }, function(err, ret) {
        err.message.should.eql('error hehe');
        done();
      });
    });
  });

  describe('Close', function() {
    it('should kill', function(done) {
      r1.kill();
      server.close(done);
    });

  });




});
