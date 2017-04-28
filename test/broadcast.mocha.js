
process.env.NODE_ENV  = 'test';
process.env.DEBUG     = 'gc:*';
process.env.GRID      = 'gridded:name';
//process.env.GRID_AUTH = '123456';

var fs          = require('fs');
var gridcontrol = require('../index.js');
var should      = require('should');
var path        = require('path');
var request     = require('request');
var Plan        = require('./plan.js');

describe('Broadcast action', function() {
  this.timeout(20000);

  var n1, n2, n3;
  var sync_file_size;

  after(function(cb) {
    n1.close(() => {
      n2.close(() => {
        n3.close(cb);
      });
    });
  });

  it('should create a first client', function() {
    n1 = new gridcontrol({
      peer_api_port : 10000
    });

    return n1.start();
  });

  it('should connect second client', function() {
    n2 = new gridcontrol({
      peer_api_port  : 11000,
      file_manager : {
        root_folder     : '/tmp/n2/',
        app_folder      : '/tmp/n2/app/'
      }
    });

    return n2.start()
  });

  it('should connect second client', function() {
    n3 = new gridcontrol({
      peer_api_port  : 12000,
      file_manager : {
        root_folder     : '/tmp/n3/',
        app_folder      : '/tmp/n3/app/'
      }
    });

    return n3.start()
  });

  it('should webserver be started', function(done) {
    request.get('http://localhost:10000/ping', function(err, res, body) {
      should(err).be.null();
      should(res.statusCode).eql(200);
      body.should.eql('pong');
      done();
    });
  });

  it('should start fixtures tasks', function(done) {
    var base_folder = path.join(__dirname, 'fixtures', 'app-echo');
    var task_folder = 'tasks';

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
      var ret = JSON.parse(body);
      ret['echo'].task_id.should.eql('echo');
      ret['echo'].pm2_name.should.eql('task:echo');
      ret['ping'].task_id.should.eql('ping');

      n1.task_manager.getTasks().echo.port.should.eql(10001);

      done();
    });
  });

  it('should n2 and n3 synchronized and task started', function(done) {
    var plan = new Plan(2, done);

    n2.once('synchronized', () => plan.ok(true));
    n3.once('synchronized', () => plan.ok(true));
  });


  it('should wait', function(done) {
    setTimeout(done, 2000);
  });

  it('should broadcast task', function(done) {
    var plan = new Plan(3, done);

    var a = request.post('http://localhost:10000/tasks/lb_trigger_all', {
      form : {
        task_id : 'echo',
        data : {
          name : 'yey'
        }
      }
    })

    a.on('data', function(data) {
      plan.ok(true);
    });

    a.on('end', function(data) {
      plan.ok(true);
    });

  });

  it('should broadcast task [Error]', function(done) {
    var plan = new Plan(3, done);

    var a = request.post('http://localhost:10000/tasks/lb_trigger_all', {
      form : {
        task_id : 'error.trigger',
        data : {
          name : 'yey'
        }
      }
    })

    a.on('data', function(data) {
      var dt = JSON.parse(data.toString());
      should.exist(dt.err);
      should.exist(dt.err.message);
      plan.ok(true);
    });

    a.on('end', function(data) {
      plan.ok(true);
    });
  });

});
