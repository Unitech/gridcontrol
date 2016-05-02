
var avro = require('avsc');
var net = require('net');

var type = avro.parse({
  name: 'Pet',
  type: 'record',
  fields: [
    {name: 'kind', type: {name: 'Kind', type: 'enum', symbols: ['CAT', 'DOG']}},
    {name: 'name', type: 'string'}
  ]
});
var buf = type.toBuffer({kind: 'CAT', name: 'Albert'}); // Encoded buffer.
var val = type.fromBuffer(buf); // {kind: 'CAT', name: 'Albert'}

console.log(val);

////

avro.assemble('./math.avdl', function (err, attrs) {
  var protocol = avro.parse(attrs)
        .on('add', function (req, ee, cb) {
          var sum = req.numbers.reduce(function (agg, el) { return agg + el; }, 0);
          setTimeout(function () { cb(null, sum); }, 1000 * req.delay);
        })
        .on('multiply', function (req, ee, cb) {
          var prod = req.numbers.reduce(function (agg, el) { return agg * el; }, 1);
          cb(null, prod);
        });

  net.createServer()
    .on('connection', function (con) { protocol.createListener(con); })
    .listen(8000);

  // var protocol = avro.parse(attrs);
  // protocol.on('ping', function (req, ee, cb) { cb(null, 'pong'); });
  // require('net').createServer()
  //   .on('connection', function (con) { protocol.createListener(con); })
  //   .listen(8000);
});

////

// avro.createFileDecoder('./values.avro')
//   .on('metadata', function (type) {
//     console.log(type);
//   })
//   .on('data', function (val) {
//     console.log(val);
//   });
