
exports.myHandler = function(data, cb) {
  cb(null, { name: data.name });
};
