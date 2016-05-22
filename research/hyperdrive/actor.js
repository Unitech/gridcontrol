'use strict';

var Swarm       = require('./interplanetary.js')
var Hyperdrive  = require('hyperdrive')
var Level       = require('memdb')
var raf         = require('random-access-file')
const bluebird  = require('bluebird')
const fs        = bluebird.promisifyAll(require('fs'))
const p         = require('path')

const Archiver  = require('./archiver.js')

const CURRENT_ROOT     = __dirname
var DAT_DOMAIN         = 'dat.local'
var DEFAULT_LOCAL_PORT = 3282
var DEFAULT_DISCOVERY  = [
  'discovery1.publicbits.org',
  'discovery2.publicbits.org'
]

let current_link = null;

var db = Level('./dat2.db')
var drive = Hyperdrive(db)

// Grid about commands (MPI)
var swarm = Swarm({
  dns: {
    server: DEFAULT_DISCOVERY,
    domain: DAT_DOMAIN,
    interval: 1000
  },
  dht: false
})

swarm.join('COMMAND-LINK')

// Grid about files sharing (P2P)
var fileSwarm = Swarm({
  dns: {
    server: DEFAULT_DISCOVERY,
    domain: DAT_DOMAIN,
    interval: 1000
  },
  dht: false
})

swarm.on('connection', function(peer) {
  // If neew peer is connected, ask peer to SYNC
  if (current_link) {
    console.log('Send link to neew peer');
    peer.write(JSON.stringify({
      cmd : 'sync',
      link : current_link
    }));
  }
});

swarm.listen()

let archiver = new Archiver({
  root           : CURRENT_ROOT,
  drive          : drive,
  interplanetary : fileSwarm
})

archiver.archive('./sharethis')
  .then(archive => {
    return archiver.spread(archive)
  })
  .then(link => {
    current_link = link;

    // Broadast to all peers already connected
    Object.keys(swarm._peersIds).forEach(function(key) {
      console.log('Sending to', key);
      swarm._peersIds[key].write(JSON.stringify({
        cmd : 'sync',
        link : current_link
      }));
    });
  })
