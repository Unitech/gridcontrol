
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

    if (!task[context.handler])
      return res.send(Tools.safeClone({
        err : new Error('Task handler "' + context.handler + '" is not defined in file ' + process.env.TASK_PATH)
      }));

    if (typeof(task[context.handler]) !== 'function')
      return res.send(Tools.safeClone({
        err : new Error('Task "' + context.handler + '" is not a function in file ' + process.env.TASK_PATH)
      }));

    task[context.handler](data, function(err, data) {
      res.send(Tools.safeClone({err:err, data: Tools.safeClone(data)}));
    });
  } else {
    if (!task || typeof(task) !== 'function') {
      return res.send(Tools.safeClone({
        err : new Error('Task does not export any main function in file ' + process.env.TASK_PATH)
      }));
    }
    task(data, function(err, data) {
      res.send(Tools.safeClone({err:err, data: Tools.safeClone(data)}));
    });
  }
});

app.use(function(err, req, res, next) {
  res.status(500);
  res.send({err: Tools.safeClone(err), data : null});
});

app.listen(process.env.TASK_PORT, '127.0.0.1', function () {
  console.log('Task: %s exposed on port %d', process.env.TASK_PATH, process.env.TASK_PORT);
});
