'use strict';
/**
 * @file Gridcontrol API
 * @author Alexandre Strzelewicz
 * @project Gridcontrol
 */

const express    = require('express');
const bodyParser = require('body-parser');
const http       = require('http');
const https      = require('https');
const fmt        = require('fmt');
const debug      = require('debug')('gc:api');
const Tools      = require('./lib/tools.js');

/**
 * Set API default values
 * @constructor
 * @this {API}
 * @param opts {object} options
 * @param opts.port Port to listen on
 * @param opts.task_manager Task manager object
 * @param opts.file_manager File manager object
 * @param opts.file_manager Network manager (cloudfunctions.js) object
 * @param opts.tls TLS keys
 */
const API = function(opts) {
  this.load_balancer = opts.load_balancer;
  this.task_manager  = opts.task_manager;
  this.file_manager  = opts.file_manager;
  this.net_manager   = opts.net_manager;
  this.port          = opts.port || 10000;
  this.tls           = opts.tls;
};

/**
 * Start API and listen to port
 * @public
 */
API.prototype.start = function() {
  this.app  = express();

  this.server = null;

  this.server = http.createServer(this.app);

  this.setMiddlewares();
  this.mountRoutes();
  this.endMiddleware();

  return new Promise((resolve, reject) => {
    // HTTP API only exposed in local
    this.server.listen(this.port, 'localhost', (err) => {
      if(err)
        return reject(err)

      debug('API listening on port %d', this.port);
      resolve()
    });
  });
};

/**
 * Stop API + Terminate Task manager
 * @public
 */
API.prototype.close = function() {
  debug('Terminating API');
  this.server.close();
};

/**
 * Set Express middlewares (JSON parsing, Attach class to req)
 * @public
 */
API.prototype.setMiddlewares = function() {
  let createDomain = require('domain').create;

  this.app.use(bodyParser.urlencoded({
    extended : true
  }));

  // Attach task manager to request for child controllers
  this.app.use((req, res, next) => {
    let domain = createDomain();

    req.load_balancer = this.load_balancer;
    req.task_manager  = this.task_manager;
    req.file_manager  = this.file_manager;
    req.net_manager   = this.net_manager;

    domain.add(req);
    domain.add(res);
    domain.run(next);
    domain.on('error', next);
  });

  this.app.use(bodyParser.json());
};

// Error middleware + error formating
API.prototype.endMiddleware = function() {
  this.app.use((err, req, res, next) => {
    fmt.sep();
    fmt.title('Error catched in express error middleware');
    if (err.stack)
      fmt.li(err.stack);
    if (err.type)
      fmt.li(err.type);
    if (err.msg)
      fmt.li(err.msg);
    if (err)
      fmt.dump(err);

    fmt.sep();
    fmt.title('Body params');
    fmt.dump(req.body);
    fmt.title('Query params');
    fmt.dump(req.params);
    fmt.sep();
    res.status(500).send({
      msg : err.message || err.msg,
      success : false
    });
  });
};

/**
 * Mount API routes
 * @public
 */
API.prototype.mountRoutes = function() {
  const app  = this.app;

  /**
   * Task endpoints
   */
  app.delete('/tasks/clear', this.task_manager.controller.clear_all_tasks);

  app.post('/tasks/lb_trigger_single', function(req, res, next) {
    req.load_balancer.route(req, res, next);
  });

  app.post('/tasks/lb_trigger_all', function(req, res, next) {
    req.load_balancer.route(req, res, next);
  });

  app.post('/tasks/init', this.task_manager.controller.init_task_group);

  app.get('/tasks/processing', function(req, res, next) {
    let tasks = req.load_balancer.processing_tasks;
    return res.send(Object.keys(tasks).map((key) => tasks[key]));
  });

  app.get('/tasks/list', this.task_manager.controller.list_tasks);
  app.get('/tasks/stats', function(req, res, next) {
    return res.send(req.load_balancer.stats_tasks);
    // var final = {};

    // req.task_manager
    //   .listAllPM2Tasks()
    //   .then((pm2_tasks) => {
    //     let tasks = req.load_balancer.stats_tasks;

    //     pm2_tasks.forEach((pm2_task_name) => {
    //       var pm2_task = pm2_task_name.split('ask:')[1]
    //       if (tasks[pm2_task])
    //         final[pm2_task] = tasks[pm2_task];
    //       else
    //         final[pm2_task] = {
    //           invokations : 0,
    //           success     : 0,
    //           errors      : 0,
    //           remote_invok: 0
    //         };
    //     });

    //     return res.send(final);
    //   })
    //   .catch((e) => {
    //     return next(e);
    //   });
  });

  /**
   * Misc endpoints
   */
  app.get('/ping', function(req, res, next) {
    return res.send('pong');
  });

  app.get('/network/change_namespace', function(req, res, next) {
    var new_namespace = req.body.namespace;

    req.net_manager.stopDiscovery()
    .then(() => {
      return req.net_manager.startDiscovery(new_namespace)
    })
    .then(() => {
      res.send({success:true, namespace: new_namespace});
    })
    .catch(next)
  });

  app.get('/hosts/list', function(req, res, next) {
    let peers = [];

    req.net_manager.getRouters().forEach((router) => {
      peers.push(router.identity);
    });

    let local = req.net_manager.getLocalIdentity();
    local.local = true;
    peers.push(local);
    res.send(peers);
  });

  app.get('/conf', function(req, res, next) {
    res.send(Tools.safeClone({
      file_manager  : req.file_manager,
      task_manager  : req.task_manager,
      load_balancer : req.load_balancer
    }));
  });
};

module.exports = API;
