var multicastdns = require('multicast-dns');
var addr         = require('network-address');
var getport      = require('./getport.js');
var debug        = require('debug')('network');

module.exports = function forum(opts, fn) {
  if (typeof opts === 'function')
    return forum(null, opts);
  if (!opts) opts = {};

  var net = null;

  if (opts.secure === true || opts.tcp_opts.key || opts.tcp_opts.cert) {
    debug('Secure TLS Connections');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    net = require('tls');
  }
  else
    net = require('net');


  var namespace = opts.namespace || 'multicast';
  var limit = opts.limit || Infinity;
  var mdns = multicastdns();
  var connections = {};
  var tcp_opts = opts.tcp_opts || {};

  var server = net.createServer(tcp_opts, function (sock) {
    sock.on('error', function (err) {
      sock.destroy(err);
    });
    track(sock);
  });

  server.peers = [];

  function track (sock) {
    if (server.peers.length >= limit) return sock.destroy();
    server.peers.push(sock);
    sock.on('close', function () {
      server.peers.splice(server.peers.indexOf(sock), 1);
    });
    server.emit('peer', sock);
  };

  server.on('listening', function () {
    var host = addr();
    var port = server.address().port;
    var id = host + ':' + port;

    mdns.on('query', function (q) {
      for (var i = 0; i < q.questions.length; i++) {
        var qs = q.questions[i];
        if (qs.name === namespace && qs.type === 'SRV')
          return respond();
      }
    });

    mdns.on('response', function (r) {
      for (var i = 0; i < r.answers.length; i++) {
        var a = r.answers[i];
        if (a.name === namespace && a.type === 'SRV')
          connect(a.data.target, a.data.port, tcp_opts || {});
      }
    });

    update();
    var interval = setInterval(update, 3000);

    server.on('close', function () {
      clearInterval(interval);
    });

    function respond () {
      mdns.response([{
        name: namespace,
        type: 'SRV',
        data: {
          port: port,
          weigth: 0,
          priority: 10,
          target: host
        }
      }]);
    }

    function update () {
      if (server.peers.length < limit)
        mdns.query([{name: namespace, type: 'SRV'}]);
    }

    function connect(host, port) {
      var remoteId = host + ':' + port;
      if (remoteId === id) return;
      if (connections[remoteId]) return;
      if (remoteId < id) return respond();

      var sock = connections[remoteId] = net.connect(port, host, opts.tcp_opts || {});

      sock.on('error', function () {
        sock.destroy();
      });

      sock.on('close', function () {
        delete connections[remoteId];
      });

      track(sock);
    };
  });

  if (fn)
    server.on('peer', fn);

  var start_port = 1025;
  var end_port   = 50000;

  if (opts.port_range) {
    start_port = opts.port_range[0];
    end_port   = opts.port_range[1];
  }

  getport(start_port, end_port, function(err, port) {
    if (err) {
      console.error(err);
      throw err;
    }
    debug('Discovery listening on port %s', port);
    server.listen(port);
  });

  return server;
}
