
var TaskManager   = require('../src/tasks_manager/task_manager.js');
var should        = require('should');
var path          = require('path');
var pm2           = require('pm2');

describe('Task Manager', function() {
  var task_manager;
  var gfiles;
  var sample_app_path = path.join(__dirname, 'fixtures', 'app1');
  var APP_NUMBER = 5;

  before(function(done) {
    pm2.connect(done);
  });

  it('should instanciate new task manager', function() {
    task_manager = new TaskManager();
  });

  it('should have right default meta tasks', function() {
    var meta = task_manager.getTaskMeta();
    meta.instances.should.eql(0);
    meta.task_folder.should.eql('tasks');
    meta.env.should.eql({});
  });

  it('should getAllTaskFiles from folder', function(done) {
    task_manager.getAllTasksInFolder(sample_app_path + '/tasks', function(err, files) {
      should(err).be.null;
      files.length.should.eql(APP_NUMBER);
      gfiles = files;
      done();
    });
  });

  it('should start all tasks in fixture folder', function(done) {
    this.timeout(8000);
    task_manager.initTaskGroup({
      task_folder : 'tasks',
      base_folder : sample_app_path,
      instances   : 2
    }, done);
  });

  it('should list the right number of tasks', function(done) {
    task_manager.listAllPM2Tasks(function(err, procs) {
      procs.length.should.eql(APP_NUMBER);
      done();
    });
  });

  it('should delete all tasks in fixture folder', function(done) {
    this.timeout(8000);
    task_manager.deleteAllPM2Tasks(done);
  });

  it('should list 0 running tasks', function(done) {
    task_manager.listAllPM2Tasks(function(err, procs) {
      procs.length.should.eql(0);
      done();
    });
  });

});
