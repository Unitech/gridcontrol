'use strict';
var Swarm      = require('./interplanetary.js')
var Hyperdrive = require('hyperdrive')
var Level      = require('memdb')
var raf        = require('random-access-file')
const bluebird = require('bluebird')
const fs       = bluebird.promisifyAll(require('fs'))
const p        = require('path')
const Archiver = require('./archiver.js')

const CURRENT_ROOT = `${__dirname}/todest`

var DAT_DOMAIN = 'dat.local'
var DEFAULT_LOCAL_PORT = 3282
var DEFAULT_DISCOVERY = [
  'discovery1.publicbits.org',
  'discovery2.publicbits.org'
]

const COMMON_DNS_OPTS = {
  server: DEFAULT_DISCOVERY,
  domain: DAT_DOMAIN,
  interval: 1000
};

var db = Level('./dat.db')
var drive = Hyperdrive(db)

// Grid about commands (MPI)
var swarm = Swarm({
  dns: COMMON_DNS_OPTS,
  dht: false
})

swarm.listen()
swarm.join('COMMAND-LINK')

// Grid about files sharing (P2P)
var fileSwarm = Swarm({
  dns: COMMON_DNS_OPTS,
  dht: false
})

fileSwarm.listen();

let archiver = new Archiver({
  root           : CURRENT_ROOT,
  drive          : drive,
  interplanetary : fileSwarm
})

swarm.on('connection', function(peer) {
  peer.on('data', function(raw) {
    var pckt = JSON.parse(raw);

    if (pckt.cmd == 'sync') {
      var link = pckt.link;

      console.log('Downloading file on link %s', link);
      archiver.download(link)
        .then(() => {
          console.log('Download finished');
        })
    }
    else {
      console.log('unknown command %s', pckt.cmd || pckt);
    }


  });
});
