var publicIp = require('public-ip');

console.log('wwww');
publicIp.v4(function (err, ip) {
  console.log(err, ip);
  //=> '46.5.21.123'
});
