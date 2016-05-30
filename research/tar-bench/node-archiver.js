
var path = require('path');
var archiver = require('node-archiver');

console.time('node-archiver');
archiver(path.join(__dirname, 'node_modules'), './my-archive.tar.gz', () => {
  console.timeEnd('node-archiver');
});
