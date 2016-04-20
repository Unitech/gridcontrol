
process.env.DEBUG='network,api';

var fs      = require('fs');
var network = require('../index.js');
var should  = require('should');
var path    = require('path');
var request = require('request');

describe('Network', function() {
  var n1, n2, n3;

  it('should handle connections', function(done) {
    n1 = new network({
      peer_api_port : 10000,
      is_file_master: true
    }, done);
  });

  it('should connect second client', function(done) {
    n2 = new network({
      peer_api_port  : 11000,
      tmp_file       : '/tmp/n2.tar.gz',
      tmp_folder     : '/tmp/n2'
    }, done);
  });

  it('n1 should list 1 peer', function(done) {
    should(n1.getPeers().length).eql(1);
    done();
  });

  it('n2 should list 1 peer', function(done) {
    should(n2.getPeers().length).eql(1);
    setTimeout(done, 1000);
  });

  describe('API Interactions', function() {

    it('should webserver be started', function(done) {
      request.get('http://localhost:10000/ping', function(err, res, body) {
        should(err).be.null;
        should(res.statusCode).eql(200);
        done();
        body.should.eql('pong');
      });
    });

    it('should retrieve 0 tasks started', function(done) {
      request.get('http://localhost:10000/list_tasks', function(err, res, body) {
        should(err).be.null;
        should(res.statusCode).eql(200);
        done();
      });
    });

    it('should start all fixtures tasks', function(done) {
      this.timeout(5000);
      var base_folder = path.join(__dirname, 'fixtures', 'app1');
      var task_folder = 'tasks';

      request.post('http://localhost:10000/init_task_group', {
        form : {
          base_folder : base_folder,
          task_folder : task_folder,
          instances   : 1
        }
      }, function(err, res, body) {
        var ret = JSON.parse(body);
        ret['echo'].task_id.should.eql('echo');
        ret['echo'].pm2_name.should.eql('task:echo');
        ret['ping'].task_id.should.eql('ping');
        // Wait 2 seconds before starting to process msg
        setTimeout(done, 1000);
      });
    });

    it('should n1 peers synchronized', function(done) {
      fs.lstatSync('/tmp/n2.tar.gz');
      fs.lstatSync('/tmp/n2/');
      done();
    });

    it('should trigger task', function(done) {
      request.post('http://localhost:10000/trigger', {
        form : {
          task_id : 'echo',
          data : {
            name : 'yey'
          }
        }
      }, function(err, raw, body) {
        var res = JSON.parse(body);
        res.data.hello.should.eql('yey');
        done();
      });
    });

    it('should connect THIRD node', function(done) {
      n3 = new network({
        peer_api_port  : 12000,
        tmp_file       : '/tmp/n3.tar.gz',
        tmp_folder     : '/tmp/n3'
      }, function() {
        setTimeout(done, 1000);
      });
    });

    it('should N3 autosync because file already gen', function(done) {
      fs.lstatSync('/tmp/n3.tar.gz');
      fs.lstatSync('/tmp/n3/');
      done();
    });

    it('should clear (file + api)', function(done) {
      n1.close(function() {
        n3.close(function() {
          n2.close(done);
        });
      });
    });

    it.skip('should clear all tasks', function(done) {
      request.delete('http://localhost:10000/clear_all_tasks', function(err, raw, body) {
        done();
      });
    });

  });

});
