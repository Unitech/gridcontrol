
process.env.NODE_ENV  = 'test';
process.env.DEBUG     = 'gc:*';
process.env.GRID      = 'grid:name';
//process.env.GRID_AUTH = '123456';

var fs          = require('fs');
var gridcontrol = require('../index.js');
var should      = require('should');
var path        = require('path');
var request     = require('request');
var Plan        = require('./plan.js');

describe('Multi local Gridcontrol', function() {
  this.timeout(15000);

  var n1, n2, n3;

  after(function(done) {
    n1.close(function() {
      n2.close(function() {
        n3.close(done);
      });
    });

  });

  describe('Two nodes synchronized', function() {

    it('should create a first client', function() {
      throw new Error('sadsaddsa');
      n1 = new gridcontrol({
        peer_api_port : 10000
      });

      return n1.start();
    });

    it('should connect second client', function(done) {
      n2 = new gridcontrol({
        peer_api_port  : 11000,
        file_manager : {
          root_folder     : '/tmp/n2/',
          app_folder      : '/tmp/n2/app/'
        }
      });

      n1.once('confirmed:peer', () => {
        done()
      });

      n2.start();
    })

    it('should start all fixtures tasks', function(done) {
      var base_folder = path.join(__dirname, 'fixtures', 'app1');
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

    it('should n2 be synchronized', function(done) {
      var plan = new Plan(2, done);

      n2.once('tasks_started', () => plan.ok(true));
      n2.once('synchronized', () => plan.ok(true));
    });

  });

  describe('Third node join and should synchronize', function() {
    it('should create a third client', function(done) {
      n3 = new gridcontrol({
        file_manager : {
          root_folder     : '/tmp/n3/',
          app_folder      : '/tmp/n3/app/'
        },
        peer_api_port : 12000
      });

      n1.once('confirmed:peer', () => {
        done()
      });

      n3.start();
    });

    it('should n3 get synchronized', function(done) {
      var plan = new Plan(2, done);

      n3.once('tasks_started', () => plan.ok(true));
      n3.once('synchronized', () => plan.ok(true));
    });
  });

  describe('Modified application all peers should sync', function() {
    it('should start all fixtures tasks', function(done) {
      var plan = new Plan(3, done);

      n2.once('tasks_started', () => plan.ok(true));
      n3.once('tasks_started', () => plan.ok(true));

      var base_folder = path.join(__dirname, 'fixtures', 'app1-modified');
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
        plan.ok(true);
      });
    });
  });

})
