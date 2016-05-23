
var request         = require('request');
var EventEmitter    = require('events').EventEmitter;

/**
 * Client constructor
 * @constructor
 * @this {Client}
 * @param opts.task_folder
 * @param opts.instances
 * @param opts.env
 */
var Client = function() {
  this.base_url    = 'http://localhost:10000';
};

/**
 * This module is a SINGLETON
 * Everywhere the module is required, it will be the same instance
 */
module.exports = new Client;

Client.prototype.__proto__ = EventEmitter.prototype;

Client.prototype.init = function(opts, cb) {
  EventEmitter.call(this);

  this.task_folder = opts.task_folder;
  this.env         = opts.env;
  this.instances   = opts.instances || 0;
  this.base_url    = 'http://localhost:' + (opts.port || 10000);
  this.skip_grid   = opts.skip_grid || false;

  var meta = {
    task_folder : this.task_folder,
    instances   : this.instances,
    base_folder : process.cwd(),
    env         : this.env
  };

  if (this.skip_grid) {
    this.emit('ready');
    return cb ? cb(null, { local : true }) : false;
  }

  request.post({
    url  : this.base_url + '/tasks/init',
    json : meta
  }, (err, res, body) => {
    if (err && err.code === 'ECONNREFUSED') {
      var msg = new Error('Cannot connect to local Gridcontrol, please install: pm2 install gridcontrol');
      this.emit('error', msg);
      return cb ? cb(msg) : false;
    }

    if (err) {
      this.emit('error', err);
      return cb ? cb(err) : false;
    }

    this.emit('ready');
    return cb ? cb(null, body) : false;
  });
  return this;
};

Client.prototype.dispatch = Client.prototype.exec = Client.prototype.invoke = function(task_name, data, opts, cb) {
  var that = this;

  if (typeof(opts) == 'function') {
    cb = opts;
    opts = {};
  }

  if (typeof(data) == 'function') {
    cb   = data;
    data = null;
    opts = {};
  }

  request.post(this.base_url + '/tasks/lb_trigger_single', {
    form : {
      task_id : task_name,
      data    : data,
      opts    : opts
    }
  }, function(err, raw, body) {
    if (err) {
      return cb(err);
    }

    if (raw.statusCode >= 500) {
      return cb(raw.body);
    }

    var ret = null;

    try {
      ret = JSON.parse(body);
    } catch(e) {
      ret = body;
    }

    if (typeof(ret) === 'object')
      return cb(ret.err, ret.data, ret.server);
    else
      return cb(ret);
  });
};

Client.prototype.listTasks = function(cb) {
  request.get(this.base_url + '/tasks/list', function(err, r, b) {
    return cb(err, parseBody(b));
  });
};

Client.prototype.listProcessingTasks = function(cb) {
  request.get(this.base_url + '/tasks/processing', function(err, r, b) {
    return cb(err, parseBody(b));
  });
};

Client.prototype.listHosts = function(cb) {
  request.get(this.base_url + '/hosts/list', function(err, r, b) {
    return cb(err, parseBody(b));
  });
};

Client.prototype.stopTasks = function(cb) {
  request.delete(this.base_url + '/tasks/clear', function(err, raw, b) {
    return cb(err, parseBody(b));
  });
};

Client.prototype.all = function(task_name, data, eventemitter) {
  var ee = new EventEmitter();

  var a = request.post(this.base_url + '/tasks/lb_trigger_all', data);

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

function parseBody(data) {
  var ret = null;

  if (!data)
    return null;

  try {
    ret = JSON.parse(data);
  } catch(e) {
    console.error('Error while parsing', e.message);
    ret = data;
  }
  return ret;
}
