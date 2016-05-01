
process.env.NS='test:namespace:two';
process.env.DEBUG='network,api';

var should  = require('should');
var Plan    = require('./plan.js');
var NetFunctions = require('net-functions-pm2');

describe('Client test', function() {
  var client, n1;

  it('should get the right object', function(done) {
    var plan = new Plan(3, done);

    client = require('..');
    var client2 = require('..');
    var client3 = require('..');
    var client5 = require('./other.js');

    var client4 = client.conf({
      task_folder : 'fixtures/app1/tasks',
      instances   : 2,
      env         : {
        NODE_ENV : 'production'
      }
    });

    should(client).have.properties([
      'all'
    ]);

    should(client.base_url).eql('http://localhost:10000');

    client.on('error', function() {
      plan.ok(true);
    });

    client2.on('error', function() {
      plan.ok(true);
    });

    client5.on('error', function() {
      plan.ok(true);
    });
  });

  it('should start a node', function(done) {
    n1 = new NetFunctions({
      peer_api_port : 10000
    }, done);
  });

  it('should buffer query and receive ready event', function(done) {
    this.timeout(5000);

    var plan = new Plan(2, done);

    client.conf({
      task_folder : 'test/fixtures/app1/tasks',
      instances   : 2,
      env         : {
        NODE_ENV : 'production'
      }
    });

    client.exec('echo', { name : 'heya' }, function(err, data) {
      should(data.hello).eql('heya');
      plan.ok(true);
    });

    client.on('ready', function() {
      plan.ok(true);
    });
  });

  it('should list 1 networked hosts', function(done) {
    client.listHosts(function(e, hosts) {
      should(e).be.null;
      should(hosts.length).eql(1);
      done();
    });
  });

  it('should list 5 tasks', function(done) {
    client.listTasks(function(e, tasks) {
      should(e).be.null;
      should(tasks.length).eql(5);
      done();
    });
  });

  it('should stop all tasks', function(done) {
    client.stopTasks(done);
  });

  it('should close network', function(done) {
    n1.close(function() { done() });
  });

  it.skip('should kill pm2', function(done) {
    var pm2 = require('pm2');

    n1.close(function() {
      pm2.connect(function() {
        pm2.kill(function() {
          setTimeout(done, 1000);
        });
      });
    });
  });

});
