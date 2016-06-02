'use strict';
const dgram   = require('dgram');
const dns     = require('dns-socket');
const async   = require('async');
const request = require('request');
const Promise = require('bluebird');
const debug   = require('debug')('gc:public-ip');

const getIp = url => {
  return new Promise((resolve, reject) => {
    request({
      url     : url,
      timeout : 1500
    }, function(err, res, body) {
      if (err || res.statusCode != 200)
        return reject(err || new Error('wrong status code'));
      return resolve(body.trim());
    });
  });
}

const dnsQuery = () => {
  /**
   * DNS method
   * use myip.opendns.com
   */
  return new Promise((resolve, reject) => {
	  const socket = dns({
		  socket: dgram.createSocket('udp4')
	  });

	  socket.query({
		  question: {
			  name: 'myip.opendns.com',
			  type: 'A'
		  }
	  }, 53, '208.67.222.222', function(err, res) {
      socket.destroy();

      if (err) return reject(err);

      const ip = res.answers[0] && res.answers[0].data;
      if (!ip)
        return reject(new Error('Public IP not detected'));
      return resolve(ip);
    });
  });
};

var getPublicIp = () => {
  return Promise
    .some([
      dnsQuery(),
      getIp('http://whatismyip.akamai.com/'),
      getIp('http://icanhazip.com/'),
      getIp('http://checkip.amazonaws.com/'),
      getIp('https://api.ipify.org/')
    ], 1)
    .all();
}

module.exports = getPublicIp;

if (require.main === module) {
  getPublicIp()
    .then(function(first) {
      console.log(first);
    })
    .catch(e => {
      console.error(e);
    });
}
