

module.exports = function(context, cb) {
  console.log('Error task triggered');
  return cb(new Error('err'));
};
