
var fs = require('fs');

var archiver = require('archiver');

var archiveTar = archiver('tar', {});
var archiveTGZ = archiver('tar', {
  gzip: true,
  gzipOptions: {
    level: 1
  }
})
var archiveZIP = archiver('zip', {});

function start(archive) {
  var output = fs.createWriteStream(__dirname + '/archiver.zip');

  console.time('archive');

  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.timeEnd('archive');

    console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  archive.bulk([
    { expand : true, cwd : '../../node_modules', src : ['**/*'] }
  ]);

  archive.finalize();
}

start(archiveTGZ);
