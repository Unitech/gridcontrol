
module.exports = function(data, cb) {
  console.log('Got echo message!', data);
  cb(null, { hello: data.name || 'Anonymous' });
};
