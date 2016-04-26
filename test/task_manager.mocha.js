
var TaskManager = require('../lib/tasks_manager/task_manager.js');
var should        = require('should');
var path          = require('path');

describe('Task Manager', function() {
  var task_manager;
  var gfiles;

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
    var fixtures = path.join(__dirname, 'fixtures', 'app1', 'tasks');

    task_manager.getAllTasksInFolder(fixtures, function(err, files) {
      should(err).be.null;
      files.length.should.eql(4);
      files[0].should.eql('echo.js');
      gfiles = files;
      done();
    });
  });
});
