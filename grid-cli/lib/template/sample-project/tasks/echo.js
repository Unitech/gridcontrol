
exports.return = function(data, cb) {
  cb(null, { hello: data.name || 'Anonymous' });
};
