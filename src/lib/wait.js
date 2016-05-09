
var debug = require('debug')('wait');
var assert = require('assert');

function Wait(count, done) {
  this.done = done;
  this.count = count;
}

Wait.prototype.ok = function(expression) {
  assert(expression);

  if (this.count === 0) {
    //assert(false, 'Too many assertions called');
  } else {
    this.count--;
  }

  if (this.count === 0) {
    this.done();
  }
};

var WaitSystem = function w(event_emitter, events, cb) {
  var wait = new Wait(events.length, cb);
  events.forEach(function(event) {
    event_emitter.once(event, function() {
      debug('Got wait event %s', event);
      wait.ok(true);
    });
  });
};

module.exports = WaitSystem;
