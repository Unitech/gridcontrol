var DHT = require('bittorrent-dht')
var magnet = require('magnet-uri')

var uri = 'magnet:?xt=urn:btih:e7c688d81acf9a03f2fb7c71e5af92d17e94504f&dn=Daft.Punk.Unchained.2015.720p.BRRip.x264.AAC-ETRG';

//var uri = 'magnet:?xt=urn:btih:e3811b9539cacff680e418124272177c47477157'
var parsed = magnet(uri)

console.log(parsed.infoHash) // 'e3811b9539cacff680e418124272177c47477157'

var dht = new DHT({
  bootstrap : ['localhost:40206' ],
  host : 'localhost:40206'
})

dht.listen(parseInt(process.argv[2]) || 20000, function () {
  console.log('now listening')
})

// find peers for the given torrent info hash
dht.lookup(parsed.infoHash)

dht.on('peer', function (peer, infoHash, from) {
  console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.host + ':' + from.port)
})

dht.on('error', function (peer, infoHash, from) {
  console.log(arguments);
});
