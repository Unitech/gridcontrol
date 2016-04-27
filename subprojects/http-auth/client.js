
var fs = require('fs')
, path = require('path')
, certFile = path.resolve(__dirname, './host.cert')
, keyFile = path.resolve(__dirname, './host.key');

var request = require('request').defaults({
  cert               : fs.readFileSync(certFile),
  key                : fs.readFileSync(keyFile),
  strictSSL          : false,
  rejectUnauthorized : false
});

var options = {
  url: 'https://localhost:9000/'
};

request.get(options, function(e, r, b) {
  console.log(arguments);
});
