
var avro = require('avsc');
var net = require('net');

avro.assemble('math.avdl', function (err, attrs) {
  var protocol = avro.parse(attrs);

  protocol.emit('add', {numbers: [1, 3, 5], delay: 2}, ee, function (err, res) {
    console.log(res); // 9!
  });
  protocol.emit('multiply', {numbers: [4, 2]}, ee, function (err, res) {
    console.log(res); // 8!
  });

  var ee = protocol.createEmitter(net.createConnection({port: 8000}));
});
