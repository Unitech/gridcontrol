
module.exports = function(data, cb) {
  cb(null, { hello: data.name || 'Anonymous' });
};
