
var path = require('path');
var zlib = require('zlib');
var tar  = require('tar-fs');
var fs   = require('fs');

var a = tar
      .pack('./node_modules')
      .pipe(zlib.createGzip())
      .pipe(fs.createWriteStream('my-tarball.tar.gz'));

a.on('finish', function() {
  console.log('Tarball created');
});
