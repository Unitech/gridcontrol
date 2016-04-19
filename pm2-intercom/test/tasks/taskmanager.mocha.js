
var TaskManagement = require('../../tasks/task_management.js');
var should        = require('should');
var path          = require('path');

describe('Task Manager', function() {
  it('should test global module', function() {
    TaskManagement.should.have.properties([
      'initTaskGroup',
      'startTasks',
      'getAllTasksInFolder'
    ]);
  });

  it('should getAllTaskFiles from folder', function(done) {
    var fixtures = path.join(__dirname, '..', 'fixtures', 'app1', 'tasks');

    TaskManagement.getAllTasksInFolder(fixtures, function(err, files) {
      should(err).be.null;
      files.length.should.eql(2);
      files[0].should.eql('echo.js');
      done();
    });
  });
});
