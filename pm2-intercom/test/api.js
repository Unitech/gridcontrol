
var API    = require('../api.js');
var should = require('should');
var path = require('path');
var request = require('request');

describe('API tests', function() {
  it('should start webserver', function(done) {
    API.expose({
      port : 10000
    }, function(err) {
      should(err).be.null;
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
      done();
    });
  });

  it('should stop server', function(done) {
    API.stop();
    done();
  });

});
