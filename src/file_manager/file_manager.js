'use strict';

const debug           = require('debug')('gc:filemanager');
const fs              = require('fs');
const crypto          = require('crypto');
const Compress        = require('./compress.js');
const defaults        = require('../constants.js');
const path            = require('path');

const Hyperdrive      = require('hyperdrive')
const Level           = require('memdb')
const Archiver        = require('./archiver.js')

const exec            = require('child_process').exec;

class FilesManagement {
  constructor(opts) {
    this.app_folder       = opts.app_folder;
    this.root_folder      = opts.root_folder      || defaults.TMP_FOLDER;
    this.is_file_master   = opts.is_file_master   || false;
    this.current_sync_md5 = null;
    this.current_link     = null;

    let db = Level('./drive.db')

    this.drive = Hyperdrive(db)

    this.archiver = new Archiver({
      drive          : this.drive,
      interplanetary : opts.interplanetary,
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
  initializeAndSpread(target_folder) {
    this.is_file_master = true;

    return Compress.pack(target_folder, defaults.TMP_FILE)
      .then(() => {
        let new_md5 = getFileMD5(defaults.TMP_FILE);

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

  downloadAndExpand(link) {
    console.log('Downloading link %s into %s', link, this.root_folder);

    return this.archiver.download(link)
      .then(() => {
        var dest_file = path.join(this.root_folder, defaults.SYNC_FILE);

        console.log('Uncompressing file %s into %s',
              dest_file,
              this.app_folder);

        return Compress.unpack(dest_file, this.app_folder)
      })
  }

  clear(cb) {
    try {
      debug('Deleting %s', this.root_folder);
      rmdir(this.root_folder, cb || function() {});
    } catch(e) {
      console.error(e);
    }
  }

  toJSON() {
    return {
      root_folder      : this.root_folder,
      is_file_master   : this.is_file_master
    };
  }

  get currentLink() {
    return this.current_link
  }

  get isFileMaster() {
    return this.is_file_master
  }
}

function rmdir(folder, cb) {
  exec('rm -rf ' + folder, function(err, stdout, stderr) {
    cb();
  });
};

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
