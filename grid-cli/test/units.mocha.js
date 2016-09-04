
var should = require('should');
var Common = require('../lib/common.js');
var fs     = require('fs');

describe('Unit test', function() {
  it('should generate Gridfile', function() {
    return Common.generateGridfileSSH('/tmp/')
      .then(() => {
        fs.statSync('/tmp/Gridfile');
        return Promise.resolve();
      });
  });

  it('should parse Gridfile', function() {
    return Common.parseGridfile('/tmp/Gridfile')
      .then((conf) => {
        should.exists(conf.grid_name);
        should.exists(conf.grid_password);
        should.exists(conf.servers);

        conf.servers.forEach((server) => {
          should.exists(server.ip);
          should.exists(server.user);
        });

        should(conf.servers.length).eql(3);
        should.exists(conf.ssh_key);

        fs.statSync(conf.ssh_key);
        fs.statSync(conf.ssh_public_key);

        should.exists(conf.ssh_public_key);
      });
  });

  it('should parse Gridfile and return only one host', function() {
    return Common.parseGridfile('/tmp/Gridfile', {
      only : 'ip3'
    })
      .then((conf) => {
        should.exists(conf.grid_name);
        should.exists(conf.grid_password);
        should.exists(conf.servers);

        conf.servers.forEach((server) => {
          should.exists(server.ip);
          should.exists(server.user);
        });

        should(conf.servers.length).eql(1);
        should.exists(conf.ssh_key);

        fs.statSync(conf.ssh_key);
        fs.statSync(conf.ssh_public_key);

        should.exists(conf.ssh_public_key);
      });
  });
});
