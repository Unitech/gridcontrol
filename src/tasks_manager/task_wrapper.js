
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var Tools      = require('../lib/tools.js');

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
  var data    = req.body.data;
  var context = req.body.context;

  if (context.handler) {
    task[context.handler](data, function(err, data) {
      res.send(Tools.safeClone({err:err, data: Tools.safeClone(data)}));
    });
  } else {
    task(data, function(err, data) {
      res.send(Tools.safeClone({err:err, data: Tools.safeClone(data)}));
    });
  }
});

app.listen(process.env.TASK_PORT, '127.0.0.1', function () {
  console.log('Task: %s exposed on port %d', process.env.TASK_PATH, process.env.TASK_PORT);
});
