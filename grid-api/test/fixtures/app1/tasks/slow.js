
module.exports = function(context, cb) {
  console.log('Slow function called');
  setTimeout(function() {
    return cb(null, {success: 'yes'});
  }, 2000);
};
