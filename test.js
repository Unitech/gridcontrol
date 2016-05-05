const publicIp = require('public-ip');

publicIp.v4().then(ip => {
  console.log(ip);
  //=> '46.5.21.123'
});
