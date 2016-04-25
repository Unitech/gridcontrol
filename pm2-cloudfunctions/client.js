
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
};

Client.prototype.__proto__ = EventEmitter.prototype;

Client.prototype.conf = function(opts, cb) {
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

Client.prototype.exec = function(task_name, data, cb) {
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

    return cb(ret.err, ret.data);
  });
};

Client.prototype.listTasks = function(cb) {
  request.get(this.base_url + '/list_tasks', function(e1, r, b) {
    if (e1) return cb(e1);

    try {
      b = JSON.parse(b);
    } catch(e) {
      return cb(e);
    }

    return cb(null, b);
  });
};

Client.prototype.listHosts = function(cb) {
  request.get(this.base_url + '/hosts/list', function(e1, r, b) {
    if (e1) return cb(e1);

    try {
      b = JSON.parse(b);
    } catch(e) {
      return cb(e);
    }

    return cb(null, b);
  });
};

Client.prototype.stopTasks = function(cb) {
  request.delete(this.base_url + '/clear_all_tasks',
                 function(err, raw, body) {
                   cb(err, body);
                 });
};

Client.prototype.all = function(task_name, data, eventemitter) {
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

module.exports = new Client;
