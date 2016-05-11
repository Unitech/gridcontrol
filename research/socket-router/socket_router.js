var debug  = require('debug')('socket_router');
var crypto = require('crypto');
var actorify = require('./actorify.js');

var SocketRouter = function(socket) {
  if (!(this instanceof SocketRouter))
    return new SocketRouter(socket);

  var that = this;
  this._route_table = {};
  this.socket = socket;
  this.uuid = crypto.randomBytes(32).toString('hex');
  this._rpc_calls = {};

  this.socket.on('data', function(raw_packet) {
    try {
      raw_packet = JSON.parse(raw_packet.toString());
    } catch(e) {
      console.error('Unparsable data has been received', raw_packet.toString());
      return false;
    }
    if (!raw_packet.cmd)
      return console.error('No CMD field present to route action');

    // It's a result cb
    if (raw_packet.cmd == 'cb:result') {
      that._rpc_calls[raw_packet.data.response_id].cb(raw_packet.data.err, raw_packet.data.res);
      process.nextTick(function() {
        delete that._rpc_calls[raw_packet.data.response_id];
      });
      return false;
    }

    if (!that._route_table[raw_packet.cmd])
      return console.error('Unknown route %s', raw_packet.cmd);

    if (raw_packet.response_id) {
      that._route_table[raw_packet.cmd](raw_packet.data, function(err, res) {

        if (err instanceof Error)
          err = JSON.parse(JSON.stringify(err, ["message", "arguments", "stack", "name"]));

        that.send('cb:result', {
          res : res,
          err  : err,
          response_id : raw_packet.response_id
        });
      });
    } else {
      that._route_table[raw_packet.cmd](raw_packet.data);
    }
  });
};

SocketRouter.prototype.mount = function(route, action) {
  if (!action)
    throw new Error('Action cb undefined');

  if (this._route_table[route])
    console.warn('[WARN] Redeclaring route %s', route);

  debug('Mounting TCP route %s', route);
  this._route_table[route] = action;
};

SocketRouter.prototype.kill = function() {
  this._route_table = null;
  this.socket.destroy();
};

SocketRouter.prototype.send = function(route, data, cb) {
  var packet = {
    cmd  : route,
    data : data
  };

  if (cb && typeof(cb) == 'function') {
    // RPC style
    var uuid = crypto.randomBytes(32).toString('hex');
    this._rpc_calls[uuid] = {
      started_at : new Date(),
      command    : route,
      cb         : cb
    };

    packet.response_id = uuid;
  }

  try {
    this.socket.write(JSON.stringify(packet));
  } catch(e) {
    console.log('Got error while writeing data %s to %s', data, this.socket.identity.name);
  }
};

module.exports = SocketRouter;
