
var request = require('request');

module.exports = function(context, cb) {
  request(context.data.url || 'http://www.google.com', function (error, response, body) {
    if (error)
      return cb(error);

    if (!error && response.statusCode == 200) {
      return cb(null, body);
    }
  });
};
