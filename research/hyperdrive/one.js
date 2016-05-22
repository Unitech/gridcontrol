const signalhub = require('signalhub')
var Swarm = require('discovery-swarm')
var Hyperdrive = require('hyperdrive')
var Level = require('memdb')
var raf = require('random-access-file')
const bluebird = require('bluebird')
const fs = bluebird.promisifyAll(require('fs'))
const p = require('path')

const Archiver = require('./archiver.js')

const CURRENT_ROOT = `${__dirname}/todest`

// here are the default config dat uses:
// used for MDNS and also as the dns 'app name', you prob shouldnt change this
var DAT_DOMAIN = 'dat.local'
// dat will try this first and pick the first open port if its taken
var DEFAULT_LOCAL_PORT = 3282 
// we run the servers below you can use if you want or run your own
var DEFAULT_DISCOVERY = [
  'discovery1.publicbits.org',
  'discovery2.publicbits.org'
]

var db = Level('./dat.db')
var drive = Hyperdrive(db)

const hub = signalhub('test', ['http://localhost:8080'])

var swarm = Swarm({
  id: drive.core.id,
  dns: {server: DEFAULT_DISCOVERY, domain: DAT_DOMAIN, interval: 5000},
  dht: false,
})

swarm.listen()

let archiver = new Archiver({
  root: CURRENT_ROOT,
  drive: drive,
  interplanetary: swarm
})

hub.subscribe('sync')
.on('data', function(link) {
  console.log('got link', link)
  archiver.download(link)
  .then(() => {
    console.log('end'); 
  })
})
