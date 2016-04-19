
var TaskCommander = require('../controllers/taskCommander.js');
var should        = require('should');
var path          = require('path');

describe('TaskCommander', function() {
  it('should test global module', function() {
    TaskCommander.should.have.properties([
      '_getAllTasksInFolder',
      '_startTasks'
    ]);
  });

  it('should getAllTaskFiles from folder', function(done) {
    var fixtures = path.join(__dirname, 'fixtures', 'app1', 'tasks');

    TaskCommander._getAllTasksInFolder(fixtures, function(err, files) {
      should(err).be.null;
      files.length.should.eql(2);
      files[0].should.eql('echo.js');
      done();
    });
  });
});
