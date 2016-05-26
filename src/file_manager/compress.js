
var path = require('path');
var zlib = require('zlib');
var tar  = require('tar-fs');
var fs   = require('fs');

var Compress = module.exports = {
  pack : function(source_folder, destination, cb) {
    return new Promise((resolve, reject) => {
      var t_pack = tar.pack(source_folder);

      var stream = t_pack.pipe(zlib.createGzip())
            .pipe(fs.createWriteStream(destination));

      t_pack.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', resolve);
    });
  },
  unpack : function(source, destination_folder, cb) {
    return new Promise((resolve, reject) => {
      var s = fs.createReadStream(source);
      var b = tar.extract(destination_folder);

      s.pipe(zlib.createGunzip()).pipe(b);

      b.on('error', reject);
      b.on('finish', resolve);
    });
  }
};
