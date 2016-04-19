
var request = require('request');
var fs      = require('fs');

var FilesManagement = module.exports = {
  retrieveFile : function(ip, cb) {
    request
      .get('http://localhost:10000/files/currentsync')
      .pipe(fs.createWriteStream('doodle.png'));
  }
};
