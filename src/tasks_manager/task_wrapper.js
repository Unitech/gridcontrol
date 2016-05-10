
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
  var data = req.body.t_data;
  //var opts = req.body.t_opts;

  task(data, function(err, data) {
    // Safe clone deep response
    res.send({err:Tools.safeClone(err), data: Tools.safeClone(data)});
  });
});

app.listen(process.env.TASK_PORT, function () {
  console.log('Task: %s exposed on port %d', process.env.TASK_PATH, process.env.TASK_PORT);
});
