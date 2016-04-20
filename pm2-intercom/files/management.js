
var request   = require('request');
var fs        = require('fs');
var Compress  = require('./compress.js');
var defaults  = require('../constants.js');
var exec      = require('child_process').exec;

var FilesManagement = function(opts) {
  this.dest_file = opts.dest_file || defaults.TMP_FILE;
  this.dest_folder = opts.dest_folder || defaults.TMP_FOLDER;
};

/**
 * Download + Unzip tarball from target_ip / port
 * (for slave to synchronize with file master)
 */
FilesManagement.prototype.synchronize = function(ip, port, cb) {
  var that = this;

  var url = 'http://' + ip + ':' + port + '/files/currentsync';

  FilesManagement.retrieveFile(url, that.dest_file, function() {
    Compress.unpack(that.dest_file, that.dest_folder, function() {
      // Then call TaskManagement.initTaskGroup
      return cb();
    });
  });
};

/**
 * Clear all temporary folder/files
 */
FilesManagement.prototype.clear = function(cb) {
  var that = this;

  rmdir(that.dest_folder, function(e1) {
    fs.unlink(that.dest_file, function(e2) {
      return cb(e1 || e2);
    });
  });
};

/**
 * Get route and pipe file to dest_file
 */
FilesManagement.retrieveFile = function(url, dest_file, cb) {
  var dest = fs.createWriteStream(dest_file);
  dest.on('close', cb);
  request.get(url).pipe(dest);
};

module.exports = FilesManagement;

function rmdir(folder, cb) {
  exec('rm -rf ' + folder, function(err, stdout, stderr) {
    cb();
  });
};
