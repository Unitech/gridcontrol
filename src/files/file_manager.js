var debug           = require('debug')('filesmanager');
var fs              = require('fs');
var crypto          = require('crypto');
var Compress        = require('./compress.js');
var defaults        = require('../constants.js');
var exec            = require('child_process').exec;
var Dss             = require('./net_fs.js');

/**
 * File manager, takes care of sync files
 * @constructor
 * @param opts {object} options
 * @param opts.dest_file {String} Port to start on
 */
var FilesManagement = function(opts) {
  this.dest_file        = opts.dest_file        || defaults.TMP_FILE;
  this.dest_folder      = opts.dest_folder      || defaults.TMP_FOLDER;
  this.is_file_master   = opts.is_file_master   || false;
  this.has_file_to_sync = opts.has_file_to_sync || false;
  this.DSS              = new Dss();

  try {
    debug('Deleting %s', this.dest_file);
    fs.unlinkSync(this.dest_file);
    debug('Deleting %s', this.dest_folder);
    fs.unlinkSync(this.dest_folder);
  } catch(e) {}

  this.current_sync_md5 = null;
};

FilesManagement.prototype.serialize = function() {
  return {
    dest_file        : this.dest_file,
    dest_folder      : this.dest_folder,
    is_file_master   : this.is_file_master,
    has_file_to_sync : this.has_file_to_sync
  };
};

/**
 * Download + Unzip tarball from target IP
 * (for slave to synchronize with file master)
 */
FilesManagement.prototype.synchronize = function(meta, cb) {
  var that = this;
  var ip = meta.ip;
  var md5 = meta.curr_md5;

  that.DSS.retrieveFile(ip, that.dest_file, function(err) {
    if (err) return cb(err);

    /**
     * MD5 Checksum verification
     * Retry if wrong checksum
     */
    if (FilesManagement.getFileMD5(that.dest_file) != md5) {
      console.error('Wrong downloaded file MD5, retrying...');
      setTimeout(function() {
        that.synchronize(meta, cb);
      }, 1000);
      return false;
    }

    Compress.unpack(that.dest_file, that.dest_folder, function() {
      return cb(null, {
        dest_folder : that.dest_folder,
        dest_file   : that.dest_file
      });
    });
  });
};

FilesManagement.getFileMD5 = function(file) {
  var checksum = null;
  var that     = this;

  try {
    var data = fs.readFileSync(file);

    checksum = crypto
      .createHash('md5')
      .update(data, 'utf8')
      .digest('hex');

  } catch(e) {
    console.error('Got error while generating file MD5');
    console.error(e);
  }

  return checksum;
};

/**
 * Function called by File Master
 * Called via task_controller on init_task_group
 */
FilesManagement.prototype.prepareSync = function(base_folder, cb) {
  var that = this;

  // Create tarball
  Compress.pack(base_folder, defaults.SYNC_FILE, function(e) {
    if (!e) {
      that.has_file_to_sync = true;
      that.is_file_master   = true;
      that.current_sync_md5 = FilesManagement.getFileMD5(defaults.SYNC_FILE);
      // Start Distributed Source System
      that.DSS.instanciateMaster();
    }

    return cb(e, {
      folder : base_folder,
      target : defaults.SYNC_FILE
    });
  });
};

FilesManagement.prototype.isFileMaster = function() {
  return this.is_file_master;
};

FilesManagement.prototype.getFilePath = function() {
  return this.dest_folder;
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
      return cb();
    });
  });
};

FilesManagement.prototype.getCurrentMD5 = function() {
  return this.current_sync_md5;
};

FilesManagement.prototype.getDestFileMD5 = function() {
  return FilesManagement.getFileMD5(this.dest_file);
};

module.exports = FilesManagement;

function rmdir(folder, cb) {
  exec('rm -rf ' + folder, function(err, stdout, stderr) {
    cb();
  });
};
