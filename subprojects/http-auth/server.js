
var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('./host.key', 'utf8');
var certificate = fs.readFileSync('./host.cert', 'utf8');

var credentials = {
  key: privateKey,
  cert: certificate
};

var express = require('express');
var app = express();

// your express configuration here

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

app.get('/', function(req, res) {
  res.send({success:true});
});

//httpServer.listen(80);
httpsServer.listen(9000, function() {
  console.log('HTTPS server listening on port 9000');
});
