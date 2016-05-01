
var request         = require('request');
var util            = require('util');
var EventEmitter    = require('events').EventEmitter;

/**
 * opts.task_folder
 * opts.instances
 * opts.env
 */
var Intercom = function() {
  // Singleton
};

Intercom.prototype.conf = function(opts, cb) {
  var that = this;

  EventEmitter.call(this);

  this.task_folder = opts.task_folder;
  this.env         = opts.env;
  this.instances   = opts.instances || 0;
  this.base_url    = 'http://localhost:' + (opts.port || 10000);

  request.post({
    url : this.base_url + '/init_task_group',
    json : {
      task_folder : this.task_folder,
      instances   : this.instances,
      base_folder : __dirname,
      env         : this.env
    }
  }, function(err, res, body) {
    if (err) {
      that.emit('error', err);
      return cb ? cb(err) : false;
    }
    that.emit('ready');
    return cb ? cb(null, body) : false;
  });
  return this;
};

Intercom.prototype.exec = function(task_name, data, cb) {
  var that = this;

  request.post(this.base_url + '/trigger', {
    form : {
      task_id : task_name,
      data    : data
    }
  }, function(err, raw, body) {
    if (err) {
      that.emit('error', err);
      return cb(err);
    }

    var ret = null;

    try {
      ret = JSON.parse(body);
    } catch(e) {
      ret = body;
    }

    return cb(null, ret);
  });
};

Intercom.prototype.all = function(task_name, data, eventemitter) {
  var ee = new EventEmitter();

  var a = request.post(this.base_url + '/all', data);

  a.on('error', function(e) {
    ee.emit('error', e);
  });

  a.on('data', function(data) {
    ee.emit('task:progress', data);
  });

  a.on('end', function(data) {
    ee.emit('end');
  });

  return ee;
};

util.inherits(Intercom, EventEmitter);

module.exports = new Intercom;
