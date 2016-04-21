
var should = require('should');

describe('Client test', function() {
  var client;

  it('should get the right object', function(done) {

    client = require('../client.js');

    var client4 = client.conf({
      task_folder : 'tasks',
      instances   : 2,
      env         : {
        NODE_ENV : 'production'
      }
    });

    var client2 = require('../client.js');
    var client3 = require('../client.js');

    var client5 = require('./other.js');

    should(client).have.properties([
      'all'
    ]);

    should(client.base_url).eql('http://localhost:10000');

    console.log(client);

    client.on('error', function() {
    });

    client2.on('error', function() {
    });

    client5.on('error', function() {
      done();
    });
  });


});
