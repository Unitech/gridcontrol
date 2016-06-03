
const path = require('path');
const zlib = require('zlib');
const tar  = require('tar-fs');
const fs   = require('fs');

var Compress = module.exports = {
  pack : function(source_folder, destination, cb) {
    return new Promise((resolve, reject) => {

      var compressor = zlib.createGzip({
        level: 1
      });

      var t_pack = tar.pack(source_folder);

      var stream = t_pack.pipe(zlib.createGzip())
            .pipe(compressor)
            .pipe(fs.createWriteStream(destination));

      //@todo: close all stream if error
      t_pack.on('error', reject);
      compressor.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', resolve);
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
