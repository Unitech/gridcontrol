
process.env.NODE_ENV='test';
process.env.DEBUG='network,api,lb';
process.env.NS='xcs:test:namespace';

var gridcontrol = require('../index.js');
var should = require('should');
var request = require('request');
var path = require('path');

describe('Multi Tasks test', function() {
  this.timeout(7000);
  var n1;

  it('should create a first client', function(done) {
    n1 = gridcontrol({
      peer_api_port : 10000
    });

    n1.start(done);
  });

  it('n1 should list 0 peer', function(done) {
    should(n1.getSockets().length).eql(0);
    done();
  });

  it('should start all fixtures tasks', function(done) {
    var base_folder = path.join(__dirname, 'fixtures', 'app2');
    var task_folder = 'services';

    request.post('http://localhost:10000/tasks/init', {
      form : {
        base_folder : base_folder,
        task_folder : task_folder,
        instances   : 1,
        env         : {
          NODE_ENV : 'test'
        }
      }
    }, function(err, res, body) {
      //console.log(n1.task_manager.getTasks());
      setTimeout(done, 500);
    });
  });

  describe('Error handling', function() {
    it('should get timeout', function(done) {
      request.post('http://localhost:10000/tasks/lb_trigger_single', {
        form : {
          task_id : 'infinite',
          opts : {
            timeout : 500
          }
        }
      }, function(err, res, body) {
        should(res.statusCode).eql(200);
        body = JSON.parse(body);
        body.err.code.should.eql('ETIMEDOUT' || 'ESOCKETTIMEDOUT');
        done();
      });
    });

    it('should get full error', function(done) {
      request.post('http://localhost:10000/tasks/lb_trigger_single', {
        form : {
          task_id : 'error'
        }
      }, function(err, res, body) {
        should(res.statusCode).eql(200);
        body = JSON.parse(body);
        body.err.message.should.eql('err');
        done();
      });
    });

    it('should get simple error', function(done) {
      request.post('http://localhost:10000/tasks/lb_trigger_single', {
        form : {
          task_id : 'simple_error'
        }
      }, function(err, res, body) {
        should(res.statusCode).eql(200);
        body = JSON.parse(body);
        body.err.should.eql('err');
        done();
      });
    });
  });

  describe('Specify handler when triggering', function() {
    it('should trigger python script', function(done) {
      request.post('http://localhost:10000/tasks/lb_trigger_single', {
        form : {
          task_id : 'handler.myHandler',
          data : {
            name : 'amazon'
          }
        }
      }, function(err, res, body) {
        should(res.statusCode).eql(200);
        body = JSON.parse(body);
        should(body.data.name).eql('amazon');
        done();
      });
    });
  });

  describe('Multi language support', function() {
    it('should trigger python script', function(done) {
      request.post('http://localhost:10000/tasks/lb_trigger_single', {
        form : {
          task_id : 'hello'
        }
      }, function(err, res, body) {
        should(res.statusCode).eql(200);
        body = JSON.parse(body);
        should(body.success).be.true();
        done();
      });
    });
  });

  describe('Processing tasks checks', function() {
    it('should retrieve 0 processing tasks', function(done) {
      request.get('http://localhost:10000/tasks/processing', function(err, res, body) {
        should(err).be.null();
        should(res.statusCode).eql(200);
        var tasks = JSON.parse(body);
        should(tasks.length).eql(0);
        done();
      });
    });

    it('should trigger slow task and get it as being processed', function(done) {
      this.timeout(6000);

      setTimeout(function() {
        request.get('http://localhost:10000/tasks/processing', function(err, res, body) {
          should(err).be.null();
          should(res.statusCode).eql(200);
          var tasks = JSON.parse(body);
          should(tasks.length).eql(1);
          setTimeout(done, 400);
        });
      }, 400);

      request.post('http://localhost:10000/tasks/lb_trigger_single', {
        form : {
          task_id : 'slow'
        }
      }, function(err, res, body) {
        should(res.statusCode).eql(200);
        //var res = JSON.parse(body);
        //done();
      });
    });

    it('should retrieve 0 processing tasks', function(done) {
      request.get('http://localhost:10000/tasks/processing', function(err, res, body) {
        should(err).be.null;
        should(res.statusCode).eql(200);
        var tasks = JSON.parse(body);
        should(tasks.length).eql(0);
        done();
      });
    });

  });

});
