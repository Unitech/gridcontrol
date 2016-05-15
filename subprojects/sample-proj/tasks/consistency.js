
var i = 0;

exports.return = function(data, cb) {
  cb(null, { value : data });
};


exports.stateful = function(data, cb) {
  cb(null, { value : i++ });
};
