
var write = require('fs').createWriteStream;
var pack = require('tar-pack').pack;

console.time('tar-pack');

pack('./node_modules')
  .pipe(write(__dirname + '/tar-pack.tar.gz'))
  .on('error', function (err) {
    console.error(err.stack)
  })
  .on('close', function () {
    console.timeEnd('tar-pack')
  })
