
var path = require('path');
var zlib = require('zlib');
var tar  = require('tar-fs');
var fs   = require('fs');

var Compress = module.exports = {
  pack : function(source_folder, destination, cb) {
    var stream = tar
          .pack(source_folder)
          .pipe(zlib.createGzip())
          .pipe(fs.createWriteStream(destination));

    stream.on('error', cb);
    stream.on('finish', cb);
  },
  unpack : function(source, destination_folder, cb) {
    var s = fs.createReadStream(source);
    var b = tar.extract(destination_folder);

    s.pipe(zlib.createGunzip()).pipe(b);

    b.on('finish', cb);
  }
};
