
// curl -H 'X-Auth-Token: 8fad00b4-ab78-4363-b5ab-f995cf97ee4a' -H 'Content-Type: application/json' https://api.scaleway.com/server

var request = require('request');

var Scaleway = function(token) {
  var that = this;

  this.server_list = [];

  this.request = request.defaults({
    headers : {
      'X-Auth-Token' : token
    }
  });

  this.base_url = 'https://api.scaleway.com';

  this.doGet = function(path, cb) {
    var url = this.base_url + path;

    this.request.get(url, function(err, res, body) {
      if (err) return cb(err);
      return cb(null, JSON.parse(body));
    });
  };

  this.doPost = function(path, data, cb) {
    var url = this.base_url + path;

    this.request.post({
      url : url,
      json : data
    }, function(err, res, body) {
      if (err) return cb(err);
      return cb(null, body);
    });
  };
};

Scaleway.prototype.init= function(fn) {
  var that = this;
  this.doGet('/servers', function(err, data) {
    if (err) throw new Error(err);
    that.server_list = data.servers;
    fn();
  });
};

Scaleway.prototype.listServers = function(cb) {
  return cb(null, this.server_list);
};

Scaleway.prototype.listActions = function(hostname, cb) {
  var that = this;

  this.getServerMetaFromHostname(hostname, function(err, server) {
    that.doGet('/servers/' + server.id + '/action', cb);
  });
};

Scaleway.prototype.actionServer = function(hostname, action, cb) {
  var that = this;

  this.getServerMetaFromHostname(hostname, function(err, server) {
    that.doPost('/servers/' + server.id + '/action', {
      action : action
    }, cb);
  });
};

Scaleway.prototype.listSnapshots = function(cb) {
  this.doGet('/snapshots', cb);
};

Scaleway.prototype.getServerMetaFromHostname = function(hostname, cb) {
  var t_server = null;
  this.server_list.forEach(function(server) {
    if (server.hostname == hostname)
      t_server = server;
  });
  return cb(null, t_server);
};

module.exports = Scaleway;
