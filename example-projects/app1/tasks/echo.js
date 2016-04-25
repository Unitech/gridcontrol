
module.exports = function(context, cb) {
  cb(null, { hello: context.data.name || 'Anonymous' });
};
