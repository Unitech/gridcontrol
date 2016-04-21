
var request         = require('request');
var util            = require('util');
var EventEmitter    = require('events').EventEmitter;

/**
 * opts.task_folder
 * opts.instances
 * opts.env
 */
var Intercom = function() {
  console.log('instanciate', arguments);

  var a,b, toto;

  (a, b) => toto;

};

Intercom.prototype.conf = function(opts) {
  // Call localhost conf
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
      base_folder : __dirname
    }
  }, function(err, res, body) {
    if (err)
      return that.emit('error', err);
    console.log('Localhost set as file master');
  });
  return this;
};

Intercom.prototype.all = function(task_name, data, eventemitter) {
};

util.inherits(Intercom, EventEmitter);

module.exports = new Intercom;
