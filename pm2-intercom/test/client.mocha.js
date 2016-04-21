
describe('Client test', function() {
  var client;

  it('should get the right object', function(done) {

    client = require('../client.js')({
      task_folder : 'tasks',
      instances   : 2,
      env         : {
        NODE_ENV : 'production'
      }
    });

    //typeof(client) == 'function';

    client.all.should.exist();
    done();
  });


});
