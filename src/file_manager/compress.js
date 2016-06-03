
const path     = require('path');
const zlib     = require('zlib');
const tar      = require('tar-fs');
const bluebird = require('bluebird');
const fs       = require('fs');
const defaults = require('../constants.js');
const ignore   = require('ignore');

var Compress = module.exports = {
  pack : function(source_folder, destination, cb) {

    return new Promise((resolve) => {
      fs.readFile(path.join(source_folder, defaults.IGNORE_FILE), (e, data) => {
        if (!e && data)
          return resolve(ignore().add(data.toString().split('\n')));
        return resolve(null);
      })
    }).then((ignore) => {
      return new Promise((resolve, reject) => {
        var compressor = zlib.createGzip({
          level: 1
        });

        var opts = {};

        if (ignore) {
          opts = {
            ignore : (name) => {
              return !ignore.filter(name).length;
            }
          }
        }

        var t_pack = tar.pack(source_folder, opts);

        var stream = t_pack.pipe(zlib.createGzip())
              .pipe(compressor)
              .pipe(fs.createWriteStream(destination));

        //@todo: close all stream if error
        t_pack.on('error', reject);
        compressor.on('error', reject);
        stream.on('error', reject);
        stream.on('finish', resolve);
      });
    });
  },
  unpack : function(source, destination_folder, cb) {
    return new Promise((resolve, reject) => {
      var decompressor = zlib.createGunzip();

      var s = fs.createReadStream(source);
      var b = tar.extract(destination_folder);

      s.pipe(zlib.createGunzip())
        .pipe(decompressor)
        .pipe(b);

      //@todo: close all stream if error
      decompressor.on('error', reject);
      b.on('error', reject);
      b.on('finish', resolve);
    });
  }
};
