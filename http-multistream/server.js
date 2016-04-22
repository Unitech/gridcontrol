
var express = require('express');

var app = express();

app.post('/all', function(req, res, next) {
  var i = 0;
  var inter = setInterval(function() {
    if (i++ == 5) {
      clearInterval(inter);
      return res.end(JSON.stringify({ toto : 'true' }));
    }
    res.write(JSON.stringify({ toto : 'true' }));

  }, 500);
});

app.listen(2550);
