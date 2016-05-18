'use strict'
const debug = require('debug')('wait');
const assert = require('assert');

function Wait(count, resolve, reject) {
  this.resolve = resolve;
  this.reject = reject;
  this.count = count;
}

Wait.prototype.ok = function(expression) {
  assert(expression);

  if (this.count === 0) {
    return this.reject('Too many assertions called');
  }

  this.count--;

  if (this.count === 0) {
    this.resolve();
  }
};

const WaitSystem = function w(event_emitter, events) {
  return new Promise((resolve, reject) => {
    const wait = new Wait(events.length, resolve, reject);
    events.forEach(function(event) {
      event_emitter.once(event, function() {
        debug('Got wait event %s', event);
        wait.ok(true); //?
      });
    });
  });
};

module.exports = WaitSystem;
