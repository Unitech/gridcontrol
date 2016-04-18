var airswarm = require('airswarm');

airswarm('testing', function (sock) {
  sock.write('hello world (' + process.pid + ')\n');

  fstream.Reader({ path: path.join(__dirname, 'node_modules'), type: "Directory" })
    .on('error', onError)
    .pipe(packer)
    .pipe(sock);

  //sock.pipe(process.stdout);
})

var address = require('network-address');

console.log(address());


var fs = require('fs');
var path = require('path');
var fstream = require('fstream');
var tar = require('tar');

function onError(err) {
  console.error('An error occurred:', err);
}

function onEnd() {
  console.log('Packed!');
}

var packer = tar.Pack()
  .on('error', onError)
  .on('end', onEnd);

var dirDest = fs.createWriteStream('dir.tar');

fstream.Reader({ path: path.join(__dirname, 'node_modules'), type: "Directory" })
  .on('error', onError)
  .pipe(packer)
  .pipe(dirDest);
