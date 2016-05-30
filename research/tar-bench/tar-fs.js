
var tar = require('tar-fs')
var fs = require('fs')
var zlib = require('zlib');

var compressor = zlib.createGzip({
    gzip: true,
    gzipOptions: {
      level: 1
    }
});

compressor.on('error', function(err){
  console.error(err);
});

// packing a directory
console.time('tar-fs');
var st = tar.pack('./../../node_modules')
      .pipe(fs.createWriteStream('my-tarball.tgz'))

st.on('finish', function() {

  console.log('Time to create raw Tar file');
  console.timeEnd('tar-fs');

  var zlib = require('zlib');
});
