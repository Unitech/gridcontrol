
var Discovery = require('torrent-discovery');
var DHT = require('bittorrent-dht');
var hat = require('hat');

var magnet = require('magnet-uri');
var uri = 'magnet:?xt=urn:btih:e7c688d81acf9a03f2fb7c71e5af92d17e94504f&dn=Daft.Punk.Unchained.2015.720p.BRRip.x264.AAC-ETRG';
var parsed = magnet(uri)

var discovery = new Discovery({
  infoHash : parsed.infoHash,
  peerId : hat(160),
  port : 6000,
  dht : DHT,
  intervalMs : 1000
});

discovery.on('peer', function() {
  console.log(arguments);
});

discovery.on('dhtAnnounce', function () {
  console.log(arguments);
})

discovery.on('warning', function (err) {
  console.log(arguments)
})

discovery.on('error', function (err) {
  console.log(arguments);
})
