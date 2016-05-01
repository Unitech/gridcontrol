
module.exports = function(context, cb) {
  console.log('Got echo message!');
  cb(null, { hello: context.data.name || 'Anonymous' });
};
