
var request = require('request');
var pm2 = require('pm2');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function MasterCom(opts) {
  var that = this;

  EventEmitter.call(this);

  this.base_url = 'http://localhost:' + opts.base_port || 10000;

  pm2.connect(function() {
    that.emit('pm2:connected');

    pm2.start({
      script : './master.js',
      name : 'TaskManager'
    }, function() {
      pm2.disconnect();
    });
  });
}

MasterCom.prototype.exec = function(task, data, cb) {
  var that = this;

  request.post({
    url : that.base_url + '/trigger',
    json : {
      task_file : task,
      data : data
    }
  }, function(err, res, body) {
    return cb(err, body);
  });
};

MasterCom.prototype.tasks = function(cb) {
  var that = this;

  request.get(that.base_url + '/tasks', function(err, res, body) {
    return cb(err, body);
  });
};

util.inherits(MasterCom, EventEmitter);

module.exports = MasterCom;
