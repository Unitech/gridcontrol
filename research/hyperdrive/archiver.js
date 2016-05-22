'use strict';
const raf = require('random-access-file')
const bluebird = require('bluebird')
const fs = bluebird.promisifyAll(require('fs'))
const p = require('path')

module.exports = Archiver

function Archiver(options) {
  if(!(this instanceof Archiver)) { return new Archiver(options) }

  if(!options.drive) throw new ReferenceError('Provide a hyperdrive')
  if(!options.root) throw new ReferenceError('Provide a root directory')
  if(!options.interplanetary) throw new ReferenceError('Provide Interplanetary')

  this.drive = options.drive 
  this.root = options.root
  this.interplanetary = options.interplanetary
}


/**
 * @param root root path
 * @param options.filters filters
 * @param options.maxDepth mas depth, default Infinity
 * @private
 * @return Promise
 */
Archiver.prototype._recursiveReaddir = function(root, options) {
  let items =  fs.readdirAsync(root)
  if (!options.root) options.root = root

  for (let i in options.filters)
    items = items.filter(options.filters[i])

  return items.map((f) => {
    var path = p.join(root, f)

    return fs.statAsync(path)
    .then((stat) => {
      let depth = root.replace(options.root, '').split(p.sep).length

      if (depth > options.maxDepth) {
        console.error('MaxDepth (%s) reached on %s recursive readDir', options.maxDepth, options.root) 
        return options.onFile ? options.onFile(path, stat) : Promise.resolve(path)
      }

      if (stat.isDirectory()) {
        return this._recursiveReaddir(path, options) 
      }

      return options.onFile ? options.onFile(path, stat) : Promise.resolve(path)
    })
  }).then(function(paths) {
    paths.push(root)
    return [].concat.apply([], paths)
  })
}

Archiver.prototype._createArchive = function(key) {
  let opts = {
    file: (name, options) => {
      console.log('Creating file %s', this.root + name);
      return raf(p.join(this.root, name))
    }
  }

  let archive = key ? this.drive.createArchive(new Buffer(key, 'hex'), opts) : this.drive.createArchive(opts)

  archive.append = bluebird.promisify(archive.append)
  archive.download = bluebird.promisify(archive.download)
  archive.list = bluebird.promisify(archive.list)
  archive.finalize = bluebird.promisify(archive.finalize)

  return archive
}

Archiver.prototype.archive = function(directory, options = {}) {
  let archive = this._createArchive()

  directory = p.resolve(this.root, directory)

 return this._recursiveReaddir(directory, {
   maxDepth: options.maxDepth || Infinity,
   filters: options.filters || {},
   onFile: (f, stat) => {
     //rename file
     return archive.append(f.replace(this.root, ''))
   }
 })
 .then(function() {
    return archive.finalize() 
    .then(() => Promise.resolve(archive))
 })
}

Archiver.prototype.spread = function(archive, replicate = true) {
  if (this.link) {
    console.log('Leave %s', this.link);
    this.interplanetary.leave(this.link)
  }

  this.link = archive.key.toString('hex')

  console.log('Join %s', this.link);
  this.interplanetary.join(this.link)

  this.interplanetary._stream = function() {
    // this is how the swarm and hyperdrive interface
    return archive.replicate()
  }

  return Promise.resolve(this.link)
}

Archiver.prototype.download = function(link) {
  let archive = this._createArchive(link)

  return this.spread(archive)
  .then(link => {
    return bluebird.map(archive.list(), function(e, i) {
      console.log(e.name);
      return archive.download(i) 
    })
  })
  .then(() => {
    console.log('done download');
    return Promise.resolve()
  })
}
