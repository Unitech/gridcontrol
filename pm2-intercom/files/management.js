
var request   = require('request');
var fs        = require('fs');
var Compress  = require('./compress.js');
var defaults  = require('../constants.js');
var exec      = require('child_process').exec;

var FilesManagement = function(opts) {
  this.dest_file        = opts.dest_file || defaults.TMP_FILE;
  this.dest_folder      = opts.dest_folder || defaults.TMP_FOLDER;
  this.is_file_master   = opts.is_file_master || false;
  this.has_file_to_sync = false;
};

/**
 * Download + Unzip tarball from target_ip / port
 * (for slave to synchronize with file master)
 */
FilesManagement.prototype.synchronize = function(ip, port, cb) {
  var that = this;

  var url = 'http://' + ip + ':' + port + '/files/get_current_sync';

  FilesManagement.retrieveFile(url, that.dest_file, function() {
    Compress.unpack(that.dest_file, that.dest_folder, function() {
      // Then call something like TaskManagement.initTaskGroup
      // to start apps
      return cb(null, {
        folder : that.dest_folder
      });
    });
  });
};

FilesManagement.prototype.isFileMaster = function() {
  return this.is_file_master;
};

FilesManagement.prototype.setFileMaster = function(bool) {
  return this.is_file_master = bool;
};

FilesManagement.prototype.hasFileToSync = function() {
  return this.has_file_to_sync;
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

FilesManagement.prototype.prepareSync = function(base_folder, cb) {
  var that = this;

  Compress.pack(base_folder, defaults.SYNC_FILE, function(e) {
    that.has_file_to_sync = true;
    that.is_file_master   = true;
    return cb(e, {
      folder : base_folder,
      target : defaults.SYNC_FILE
    });
  });
};

module.exports = FilesManagement;

function rmdir(folder, cb) {
  exec('rm -rf ' + folder, function(err, stdout, stderr) {
    cb();
  });
};
