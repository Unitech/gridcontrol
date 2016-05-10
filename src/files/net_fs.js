var debug    = require('debug')('filesmanager');
var fs       = require('fs');
var defaults = require('../constants.js');
var net      = require('net');
var chalk    = require('chalk');

var NetFS = function() {
  this.port        = defaults.DSS_FS_PORT;
  this.dss_running = false;
};

module.exports = NetFS;

NetFS.prototype.instanciateMaster = function(file) {
  if (this.dss_running == true) return false;

  var that = this;

  this.dss_running = true;

  this.server = net.createServer();

  this.server.on('connection', function(socket) {
    var sync = fs.createReadStream(file || defaults.SYNC_FILE);

    sync.on('error', function(e) {
      console.error(e);
    });
    sync.on('open', function() {
      sync.pipe(socket);
    });
    sync.on('finish', function() {
      socket.end();
    });
  });

  this.server.listen(that.port, function() {
    debug(chalk.bold.yellow('[DSS]') + ' Started on port %d', that.server.address().port);
  });
};

NetFS.prototype.close = function() {
  if (this.dss_running === true)
    this.server.close();
};

/**
 * Called by slave peers on connection
 */
NetFS.prototype.retrieveFile = function(meta, dest_file, cb) {
  var dest      = fs.createWriteStream(dest_file);
  var cb_called = false;
  var client    = new net.Socket();
  var that      = this;
  var public_ip = meta.public_ip;
  var private_ip = meta.private_ip;

  dest.on('error', function(err) {
    return cb(err);
  });

  client.on('data', function(data) {
    dest.write(data);
  });

  client.on('error', function(err) {
    // if (cb_called == true) return false;
    // cb_called = true;
    return cb(err);
  });

  client.on('close', function() {
    //if (cb_called == true) return false;
    debug(chalk.bold.yellow('[DSS]') + ' File received on ', dest_file);
    return cb();
  });

  client.connect({
    port : that.port,
    host : public_ip
  });
};
