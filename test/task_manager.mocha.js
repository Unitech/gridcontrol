
var TaskManager   = require('../src/tasks_manager/task_manager.js');
var should        = require('should');
var path          = require('path');

describe('Task Manager', function() {
  this.timeout(5000);

  var task_manager;
  var gfiles;
  var sample_app_path = path.join(__dirname, 'fixtures', 'app1');
  var APP_NUMBER = 5;

  it('should instanciate new task manager', function() {
    task_manager = new TaskManager();
    return task_manager.start();
  });


  it('should have right default meta tasks', function() {
    var meta = task_manager.getTaskMeta();
    meta.instances.should.eql(0);
    meta.task_folder.should.eql('tasks');
    meta.env.should.eql({});
  });

  it('should getAllTaskFiles from folder', function() {
    return task_manager.getAllTasksInFolder(sample_app_path + '/tasks')
    .then((files) => {
      files.length.should.eql(APP_NUMBER);
      gfiles = files;
      return Promise.resolve()
    })
  });

  it('should start all tasks in fixture folder', function() {
    this.timeout(8000);
    return task_manager.initTasks({
      task_folder : 'tasks',
      base_folder : sample_app_path,
      instances   : 2
    });
  });

  it('should list the right number of tasks', function() {
    return task_manager.listAllPM2Tasks()
    .then((procs) => {
      procs.length.should.eql(APP_NUMBER);
      return Promise.resolve()
    });
  });

  it('should delete all tasks in fixture folder', function() {
    this.timeout(8000);
    return task_manager.deleteAllPM2Tasks();
  });

  it('should list 0 running tasks', function() {
    return task_manager.listAllPM2Tasks((procs) => {
      procs.length.should.eql(0);
      return Promise.resolve()
    });
  });

  it('should stop task manager', function(done) {
    task_manager.terminate(done);
  });

});
