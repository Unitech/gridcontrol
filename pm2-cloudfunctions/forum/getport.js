
var net = require('net');

function openport (start, end, cb) {
  if (!cb) {
    if (!end) {
      cb = start;
      start = 2000;
      end = 60000;
    } else {
      cb = end;
      end = 60000;
    }
  }
  if (start >= end) return cb(new Error('out of ports :('));

  var c = net.connect(start, function () {
    c.destroy();
    openport(start+1, end, cb);
  });
  c.on('error', function () {
    cb(null, start);
  });
};

module.exports = openport;
