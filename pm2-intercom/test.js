
var request = require('request');
var fs = require('fs');

request
  .get('http://localhost:10000/files/currentsync')
  .pipe(fs.createWriteStream('doodle.png'));
