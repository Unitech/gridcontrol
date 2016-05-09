
var Discovery = require('discovery-channel');
var EventEmitter    = require('events').EventEmitter;

var Interplanetary = function(opts) {
  this.peer_list = {};

  this.channel = Discovery({
    dns : true,
    dht : true
  });
};

Interplanetary.prototype.__proto__ = EventEmitter.prototype;

Interplanetary.prototype.join = function(namespace) {
  var that = this;

  this.channel.join(namespace);

  this.channel.on('peer', function(id, peer, type) {
    var isNew = false;
    var key = peer.host;

    if (!that.peer_list[key]) {
      isNew = true;
    }

    that.peer_list[key] = {
      ip       : peer.host,
      port     : peer.port,
      type     : type,
      detected : new Date()
    };

    if (isNew === true)
      that.emit('new_peer', that.peer_list[key]);
  });

  this.channel.on('whoami', function() {
    console.error('Whoami', arguments);
  });

  this.channel.on('close', function() {
    console.error('Channel closed', arguments);
  });
};

var inter = new Interplanetary();

inter.join('pm2:fs');

inter.on('new_peer', function(data) {
  console.log(data);
});
