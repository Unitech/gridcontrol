
//var net = require('utp-native');
var net = require('net');
var actorify = require('actorify');

var fs = require('fs');
// client

net.createServer(function(sock){
  var actor = actorify(sock);

  var img = new Buffer('faux data');


  actor.on('image thumbnails', function(img, sizes){
    console.log('%s byte image -> %s', img.length, sizes.join(', '));

    fs.writeFileSync('target.tar.gz', img);
    sizes.forEach(function(size){
      actor.send('thumb', size, new Buffer('thumb data'));
    });
  });
}).listen(3000);

// client

//setInterval(function(){
  var sock = net.connect(3000);
  var actor = actorify(sock);

console.log('send image for thumbs');

var img = fs.readFileSync('./grid.tar.gz');


  actor.send('image thumbnails', img, ['150x150', '300x300']);

  actor.on('thumb', function(size, img){
    console.log('thumb: %s', size);
  });
//}, 10500);
