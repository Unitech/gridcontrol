/**
 * Copyright 2014 tj
 * 2016 Edited by @Unitech
 * http://github.com/tj/node-actorify
 * Licence MIT
 */

/**
 * Module dependencies.
 */

var Emitter       = require('events').EventEmitter;
var Message       = require('amp-message');
var fmt           = require('util').format;
var amp           = require('amp');
var cs            = require('./crypto-service.js');
var debug         = require('debug')('socket-router');
/**
 * Slice ref.
 */

var slice = [].slice;

/**
 * Actor ids.
 */

var ids = 0;

/**
 * Expose `Actor`.
 */

module.exports = Actor;

/**
 * Initialize an actor for the given `Stream`.
 *
 * @param {Stream} stream
 * @api public
 */

function Actor(stream) {
  if (!(this instanceof Actor)) return new Actor(stream);
  var that = this;
  this.parser = new amp.Stream;
  this.parser.on('data', this.onmessage.bind(this));
  stream.pipe(this.parser);
  this.stream = stream;
  this.callbacks = {};
  this.ids = 0;
  this.id = ++ids;
  this.secret_key = null;
  Actor.emit('actor', this);
}

/**
 * Inherit from `Emitter.prototype`.
 */

Actor.prototype.__proto__ = Emitter.prototype;
Actor.__proto__ = Emitter.prototype;

Actor.prototype.setSecretKey = function(key) {
  this.secret_key = key;
};

/**
 * Inspect implementation.
 */

Actor.prototype.inspect = function(){
  var cbs = Object.keys(this.callbacks).length;
  return fmt('<Actor id=%d callbacks=%d>', this.id, cbs);
};

/**
 * Handle message.
 */

Actor.prototype.onmessage = function(buf){
  var msg = new Message(buf);
  var args = msg.args;
  var self = this;

  if (this.secret_key) {
    args.forEach(function(arg, i) {
      args[i] = cs.verify(args[i], self.secret_key);
    });
  }

  // reply message, invoke
  // the given callback
  if ('_reply_' == args[0]) {
    args.shift();
    var id = args.shift().toString();
    var fn = this.callbacks[id];
    delete this.callbacks[id];
    if (fn) fn.apply(null, args);
    return;
  }

  // request method, pass
  // a trailing callback
  if (isId(args[0])) {
    var id = args.shift();
    args.push(function(){
      self.send.apply(self, reply(id, arguments));
    });
  }

  this.emit.apply(this, args);
};

/**
 * Send message.
 *
 * TODO: clean up... return a Message etc
 *
 * @param {String} msg
 * @param {Mixed} ...
 * @return {Object}
 * @api public
 */

Actor.prototype.send = function(){
  if ('string' != typeof arguments[0]) throw new Error('missing message name');
  var args = slice.call(arguments);
  var last = args[args.length - 1];
  var timer;
  var that = this;

  if ('function' == typeof last) {
    var id = 'i:' + this.ids++;
    var fn = args.pop();

    function callback(){
      callback = function(){};
      clearTimeout(timer);
      fn.apply(this, arguments);
    }

    this.callbacks[id] = callback;
    //var buffer = new Buffer(id);
    args.unshift(id);
  }

  if (this.secret_key) {
    args.forEach(function(arg, i) {
      args[i] = cs.secure(args[i], that.secret_key);
    });
  }

  var msg = new Message(args);
  this.stream.write(msg.toBuffer());

  return {
    timeout: function(ms){
      timer = setTimeout(function(){
        var err = new Error('message response timeout exceeded');
        err.timeout = ms;
        callback(err);
      }, ms);
    }
  }
};

/**
 * Return a reply message for `id` and `args`.
 *
 * @param {String} id
 * @param {Array} args
 * @return {Array}
 * @api private
 */

function reply(id, args) {
  var msg = new Array(2 + args.length);

  msg[0] = '_reply_';
  msg[1] = id;

  for (var i = 0; i < args.length; i++) {
    msg[i + 2] = args[i];
  }

  return msg;
}

/**
 * ID argument.
 */

function isId(arg) {
  return 'i' == arg[0] && ':' == arg[1];
}
