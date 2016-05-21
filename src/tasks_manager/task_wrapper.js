'use strict'
const express    = require('express');
const app        = express();
const bodyParser = require('body-parser');
const Tools      = require('../lib/tools.js');

const task = require(process.env.TASK_PATH);

app.use(bodyParser.urlencoded({
  extended : true
}));

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send({
    task_path : process.env.TASK_PATH,
    task_port : process.env.TASK_PORT
  });
});

app.post('/', (req, res) => {
  let data    = req.body.data;
  let context = req.body.context;

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

app.use((err, req, res, next) => {
  res.status(500);
  res.send({err: Tools.safeClone(err), data : null});
});

app.listen(process.env.TASK_PORT, '127.0.0.1', () => {
  console.log('Task: %s exposed on port %d', process.env.TASK_PATH, process.env.TASK_PORT);
});
