

module.exports = function(context, cb) {
  // Never send anything (should timeout)

  return cb(new Error('err'));
  // console.log('Slow function called');
  // setTimeout(function() {
  //   return cb(null, {success: 'yes'});
  // }, 600);
};
