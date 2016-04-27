var request = require('request');

request.defaults({
  timeout: 10
});

var a = request.post('http://localhost:2550/all', {});

a.on('error', function(e) {
  console.log('error', e);
});
a.on('data', function(data) {
  console.log(JSON.parse(data.toString()));
});

a.on('end', function(data) {
  //console.log('end', JSON.parse(data.toString()));
  console.log(arguments);
});
