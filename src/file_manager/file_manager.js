'use strict';

const debug           = require('debug')('gc:filemanager');
const fs              = require('fs');
const crypto          = require('crypto');
const Compress        = require('./compress.js');
const defaults        = require('../constants.js');
const path            = require('path');
const rimraf          = require('rimraf');

const Hyperdrive      = require('hyperdrive')
const Level           = require('memdb')
const Archiver        = require('./archiver.js')

const Interplanetary  = require('../network/interplanetary.js');

function noop() {}

/**
 * @param {object} opts
 * @param {string} opts.app_folder ?
 * @param {string} opts.root_folder root directory to be shared
 * @param {boolean} opts.is_file_master is this the file master
 */
function FilesManagement(opts) {
  if (!(this instanceof FilesManagement)) {
    return new FilesManagement(opts);
  }

  this.root_folder      = opts.root_folder      || defaults.TMP_FOLDER;

  if (!opts.app_folder) {
    opts.app_folder = path.join(this.root_folder, 'app');
  }

  this.app_folder       = opts.app_folder;

  this.is_file_master   = opts.is_file_master   || false;
  this.current_sync_md5 = null;
  this.current_link     = null;

  let db = Level('./drive.db')

  var drive = Hyperdrive(db)

  this.drive = drive;

  this.archiver = new Archiver({
    drive          : this.drive,
    root           : this.root_folder
  })

  this.clear(() => {
    debug('Creating folder %s', this.root_folder);
    fs.mkdirSync(this.root_folder);
  });
}

/**
 * Compress target folder and share it via Hyperdrive
 *
 * @param {String} target_folder folder absolute file path
 * @return {Promise}
 */
FilesManagement.prototype.initializeAndSpread = function(target_folder) {
  this.is_file_master = true;

  return Compress.pack(target_folder, defaults.TMP_FILE)
  .then(() => {
    let new_md5 = getFileMD5(defaults.TMP_FILE);

    // Check if file change in current folder
    if (this.current_sync_md5 == new_md5)
      return Promise.reject(new Error('File has not changed'));
    else {
      debug('New file generated');
      this.current_sync_md5 = new_md5;
      return Promise.resolve();
    }
  })
  .then(() => {
    return this.archiver.archiveSolo(defaults.TMP_FILE, defaults.SYNC_FILE);
  })
  .then((archive) => {
    this.current_link = archive.key.toString('hex');
    return this.archiver.spread(archive);
  });
}

FilesManagement.prototype.downloadAndExpand = function(link) {
  var dest_file = path.join(this.root_folder, defaults.SYNC_FILE);

  debug('Joining swarm link [%s...] to sync folder [%s]', link.substring(0, 5), this.root_folder);

  try {
    // Delete previous file
    fs.unlinkSync(dest_file);
  } catch(e) {}

  return this.archiver.download(link)
    .then(() => {
      debug('Download finished');

      debug('Uncompressing file %s into %s',
            dest_file,
            this.app_folder);

      return Compress.unpack(dest_file, this.app_folder)
    })
}

FilesManagement.prototype.close = function(cb) {
  if (this.command_swarm)
    this.command_swarm.close();
  this.clear(cb);
}

FilesManagement.prototype.clear = function(cb) {
  if (this.command_swarm)
    this.command_swarm.close();
  try {
    debug('Deleting %s', this.root_folder);
    rimraf(this.root_folder, cb || noop);
  } catch(e) {
    console.error(e);
  }
}

FilesManagement.prototype.toJSON = function() {
  return {
    root_folder      : this.root_folder,
    is_file_master   : this.is_file_master
  };
}

Object.defineProperty(FilesManagement.prototype, "currentLink", {
  get: function currentLink() {
    return this.current_link
  }
});

Object.defineProperty(FilesManagement.prototype, "isFileMaster", {
  get: function isFileMaster() {
    return this.is_file_master
  }
});

function getFileMD5(file) {
  let checksum = null;
  let that     = this;

  try {
    let data = fs.readFileSync(file);

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


module.exports = FilesManagement;
