console.log('CHANGED');



module.exports = function(data, cb) {
  console.log('Got echo message!');
  cb(null, { hello: data.name || 'Anonymous' });
};
