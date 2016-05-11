
var Interplanetary  = require('./src/interplanetary/index.js');
var path = require('path');
var fs = require('fs');

function start() {
  var that = this;


  this.tls = {
    key  : fs.readFileSync(path.join(__dirname, './misc/private.key')),
    cert : fs.readFileSync(path.join(__dirname, './misc/public.crt'))
  };

  this.Interplanetary = Interplanetary({
    tls : that.tls
  });

  this.Interplanetary.listen(0);
  this.Interplanetary.join('pm2:fs');

  this.Interplanetary.on('error', function(e) {
    console.error('Interplanetary got error');
    console.error(e.message);
  });

  this.Interplanetary.on('listening', function() {
    that.network_port = that.Interplanetary._tcp.address().port;
  });

  this.Interplanetary.on('connecting', function(socket, data) {
    console.log('connecting', arguments);
  });

  this.Interplanetary.on('connection', function(socket, data) {
    console.log('Got connection', socket.address(), data.toString());
  });
}

start();
