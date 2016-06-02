
process.env.GRID   = 'security:grid';

const gridcontrol  = require('../index.js');
const Plan         = require('./plan.js');
const should       = require('should');
const socketr      = require('../src/network/secure-socket-router.js');

describe('Security tests', function() {
  var n1, n2, n3;

  describe('Data ciphering', function() {
    after(function(done) {
      n1.close(() => {
        n2.close(done);
      });
    });

    it('should create a first peer', function() {
      n1 = new gridcontrol({
        peer_api_port : 9000
      });

      return n1.start();
    });

    it('should get right data exchange', function(done) {
      var plan = new Plan(2, done);

      n2 = new gridcontrol({
        peer_api_port : 10000,
        file_manager : {
          root_folder     : '/tmp/n2/',
          app_folder      : '/tmp/n2/app/'
        }
      });

      n1.on('confirmed:peer', () => {
        plan.ok(true);
      });

      n1.on('new:peer', function(socket) {
        var router = socketr(socket);

        // Should router read clear messages
        router.on('key:exchange', data => {
          should(data).have.properties(['prime', 'key']);
          plan.ok(true);
        });

        // Should not be able to read identity message
        // Because now it is secured
        // Nowadays the peer is going to be confirmed (above validation)
        router.on('identity', data => {
          plan.ok(false);
        });
      });

      n2.start();
    });

  });


  describe('Password authentification', function() {
    this.timeout(5000);

    after(function(done) {
      n1.close(() => {
        n2.close(done);
      });
    });

    it('should create a first peer with password', function() {
      n1 = new gridcontrol({
        peer_api_port : 9000,
        password : '123456'
      });

      return n1.start();
    });

    it('should try to connect new peer with wrong password', function(done) {
      n2 = new gridcontrol({
        peer_api_port : 10000,
        file_manager : {
          root_folder     : '/tmp/n2/',
          app_folder      : '/tmp/n2/app/'
        }
      });

      n2.once('rejected', e => {
        n2.close(done);
      });

      n2.start();
    });

    it('should new peer manage to connect with right password', function(done) {
      n2 = new gridcontrol({
        peer_api_port : 10000,
        password : '123456',
        file_manager : {
          root_folder     : '/tmp/n2/',
          app_folder      : '/tmp/n2/app/'
        }
      });

      n2.once('confirmed:peer', e => {
        done()
      });

      n2.start();
    });
  });

});
