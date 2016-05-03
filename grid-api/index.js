
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
  // Singleton
  this.base_url    = 'http://localhost:10000';
};

Client.prototype.__proto__ = EventEmitter.prototype;

Client.prototype.init = function(opts, cb) {
  var that = this;

  EventEmitter.call(this);

  this.task_folder = opts.task_folder;
  this.env         = opts.env;
  this.instances   = opts.instances || 0;
  this.base_url    = 'http://localhost:' + (opts.port || 10000);

  request.post({
    url : this.base_url + '/tasks/init',
    json : {
      task_folder : this.task_folder,
      instances   : this.instances,
      base_folder : process.cwd(),
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

Client.prototype.exec = Client.prototype.invoke = function(task_name, data, cb) {
  var that = this;

  request.post(this.base_url + '/tasks/lb_trigger_single', {
    form : {
      task_id : task_name,
      data    : data
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

    return cb(ret.err, ret.data);
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
  }
  return ret;
}

module.exports = new Client;
