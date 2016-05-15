
var fs    = require('fs');
var path  = require('path');
var debug = require('debug')('tools');

var Tools = {};

Tools.readConf = function(file, cb) {
  var conf_file;

  if (typeof(file) === 'function') {
    cb = file;
    conf_file = path.resolve(process.env.HOME, '.gridcontrol.json');
  }
  else {
    conf_file = path.resolve(process.cwd(), file);
  }

  fs.readFile(conf_file, function(err, data) {
    if (err && err.code == 'ENOENT') {
      debug('First initialization');
      return cb(err);
    }
    else if (err) {
      console.error('Got uncaught error', err);
      return cb(err);
    }
    else
      return cb(null, JSON.parse(data));
  });
};

Tools.writeConf = function(file, data, cb) {
  var conf_file;

  if (typeof(data) === 'function') {
    cb = data;
    conf_file = path.resolve(process.env.HOME, '.gridcontrol.json');
  }
  else if (data == null) {
    cb = function() {};
    data = file;
    conf_file = path.resolve(process.env.HOME, '.gridcontrol.json');
  }
  else {
    conf_file = path.resolve(process.cwd(), file);
  }

  fs.writeFile(conf_file, JSON.stringify(data,' ', 2), function(err) {
    if (err) {
      console.error('Got uncaught error', err);
      return cb(err);
    }
    return cb(null, {success:true});
  });
};

function safeDeepClone(circularValue, refs, obj) {
  var copy, tmp;

  // object is a false or empty value, or otherwise not an object
  if (!obj || "object" !== typeof obj) return obj;

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array - or array-like items (Buffers)
  if (obj instanceof Array || obj.length) {
    //return Buffer as-is
    if (typeof Buffer === "function" && typeof Buffer.isBuffer === "function" && Buffer.isBuffer(obj)) {
      return new Buffer(obj);
    }

    refs.push(obj);
    copy = [];
    for (var i = 0, len = obj.length; i < len; i++) {
      if (refs.indexOf(obj[i]) >= 0) {
        copy[i] = circularValue;
      } else {
        copy[i] = safeDeepClone(circularValue, refs, obj[i]);
      }
    }
    refs.pop();
    return copy;
  }

  // Handle Object
  refs.push(obj);
  copy = {};

  if (obj instanceof Error) {
    //raise inherited error properties for the clone
    copy.name = obj.name;
    copy.message = obj.message;
    copy.stack = obj.stack;
  }

  for (var attr in obj) {
    if (refs.indexOf(obj[attr]) >= 0) {
      copy[attr] = circularValue;
    } else {
      copy[attr] = safeDeepClone(circularValue, refs, obj[attr]);
    }
  }
  refs.pop();
  return copy;
}


//method to wrap the cloning method
function cloneWrap(obj, circularValue) {
  circularValue = safeDeepClone(undefined, [], circularValue);
  return safeDeepClone(circularValue, [], obj);
}

//value to use when a circular reference is found
cloneWrap.circularValue = undefined;

Tools.safeClone = cloneWrap;

module.exports = Tools;
