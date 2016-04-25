
module.exports = function(context, cb) {
  cb(null, { env : process.env.NODE_ENV });
};
