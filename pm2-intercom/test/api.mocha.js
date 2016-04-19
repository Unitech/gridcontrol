
process.env.DEBUG="api";

var API    = require('../index.js').API;
var should = require('should');
var path = require('path');
var request = require('request');

describe('API tests', function() {
  it('should start server', function(done) {
    API.expose({
      port : 10000
    });
    done();
  });

  it('should webserver be started', function(done) {
    request.get('http://localhost:10000/ping', function(err, res, body) {
      should(err).be.null;
      should(res.statusCode).eql(200);
      done();
      body.should.eql('pong');
    });
  });

  it('should conf as task initiator', function(done) {
    request.post('http://localhost:10000/conf', {
      is_file_master : true
    }, function(err, res, body) {
      body = JSON.parse(body);
      body.is_file_master.should.be.true;
      done();
    });
  });

  it('should get conf', function(done) {
    request.get('http://localhost:10000/conf', function(e, r, b) {
      b = JSON.parse(b);
      b.hostname.should.not.be.null;
      b.address.should.not.be.null;
      b.is_file_master.should.be.true;
      done();
    });
  });

  it('should retrieve 0 tasks started', function(done) {
    request.get('http://localhost:10000/list_tasks', function(err, res, body) {
      should(err).be.null;
      should(res.statusCode).eql(200);
      done();
    });
  });

  it('should start all fixtures tasks', function(done) {
    this.timeout(5000);
    var base_folder = path.join(__dirname, 'fixtures', 'app1');
    var task_folder = path.join(__dirname, 'fixtures', 'app1', 'tasks');

    request.post('http://localhost:10000/init_task_group', {
      form : {
        base_folder : base_folder,
        task_folder : task_folder,
        instances   : 1
      }
    }, function(err, res, body) {
      var ret = JSON.parse(body);
      ret['echo'].task_id.should.eql('echo');
      ret['echo'].pm2_name.should.eql('task:echo');
      ret['ping'].task_id.should.eql('ping');
      // Wait 2 seconds before starting to process msg
      setTimeout(done, 1000);
    });
  });

  it('should trigger task', function(done) {
    request.post('http://localhost:10000/trigger', {
      form : {
        task_id : 'echo',
        data : {
          name : 'yey'
        }
      }
    }, function(err, raw, body) {
      var res = JSON.parse(body);
      res.data.hello.should.eql('yey');
      done();
    });
  });

  it('should clear all tasks', function(done) {
    request.delete('http://localhost:10000/clear_all_tasks', function(err, raw, body) {
      done();
    });
  });

  it('should stop server', function(done) {
    API.stop();
    done();
  });

});
