
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var Tools      = require('../tools.js');

var task = require(process.env.TASK_PATH);

app.use(bodyParser.urlencoded({
  extended : true
}));

app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.send({
    task_path : process.env.TASK_PATH,
    task_port : process.env.TASK_PORT
  });
});

app.post('/', function (req, res) {
  task(req.body, function(err, data) {
    // Safe clone deep response
    res.send({err:err, data: Tools.safeClone(data)});
  });
});

app.listen(process.env.TASK_PORT, function () {
  console.log('Task: %s exposed on port %d', process.env.TASK_PATH, process.env.TASK_PORT);
});
