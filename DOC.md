
# GridControl

Execute functions and tasks in a Server Grid.

Each Server will have installed a networked process manager and One master will act as the orchestrator.

This modules auto-link each process manager in the same grid name and allows to execute functions in any of them, in any languages.

The more *GridControl* you add, the more calculation power you get.

## Features

- **0 conf** auto discovery system via Bittorent DHT and DNS multicast
- **0 conf** connection system accross private network, wifi
- **0 conf** application source sharing with dependencies and consitency checks
- **Fast**: Grid interconnected via TCP/UTP sockets
- **Fast**: Always UP services (no spawn for each actions)
- **Intuitive**: Simple local HTTP API on each node
- **Polyglot**: Services can be wrotte in any language
- **Ecosystem**: Toolbox for grid management (grid CLI, provisioning, multissh)
- **Compatible** with Amazon Lambda, Google Cloud Functions
- And a lot more like Buffering, Retry on Failure, Security...

And [PM2](https://github.com/Unitech/pm2) behing the scene for process management and cluster capabilities.

## Quick start

```bash
$ npm install grid-cli -g
```

### Create a Compute Grid

On your local machine:

```bash
$ grid install <GRID_NAME>
```

To provision remote machines:

```bash
$ grid provision <USERNAME> <IP> <GRID_NAME>
```

This will SSH onto the server and will install and configure GridControl.
*GRID_NAME* is a common identifier for each calcul units to link themselves.

Provision as many server needed, then to list each units linked to the grid do:

```bash
$ grid list
```

If you need to execute commands / install softwares in batch in each unit do:

```bash
$ grid multissh <COMMAND>
```

### Create

Now we have to create a project with this structure:

```
.
├── index.js
├── package.json
└── tasks
    ├── task_1.js
    ├── task_2.js
    └── request.js
```

Let's look at the content of tasks/request.js:

```javascript
var request = require('request');

module.myHandler = function(data, cb) {
  request.get(data.url, function(err, res, body) {
    if (err) return cb(err);
    cb(null, { response : body });
  });
};
```

Now let's add some orchestration code into the index.js:

**./index.js**

```javascript
// Initialize and synchronize the whole grid
var grid = require('gridcontrol').init({
  task_folder : 'tasks'
});

setInterval(function() {

  /**
   * This will invoke the function <filename> (here request)
   * in each server connected in a round robin way
   */
  grid.dispatch('request.myHandler', {
    url : 'http://google.com/'
  }, function(err, data, server_meta) {
    console.log('From server %s:%s', server.name, server.ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

Start the main application:

```bash
$ node index.js
```

Display each host connected to the grid:

```bash
$ grid list
```

Display tasks statistics:

```bash
$ grid tasks
```

Provision a new node:

```bash
$ grid provision ubuntu@10.31.22.15 <grid-name> [square-name]
```

Each gridcontrol linked to the same grid will connect each other. Discovery is made through DNS multicast and DHT Bittorent.

*To display cloud functions logs do `$ pm2 logs gridcontrol`*

## Commands

List tasks currently managed:

```
$ pm2 ls
```

Monitor tasks memory/cpu consumption:

```
$ pm2 monit
```

Display logs:

```
$ pm2 logs <task-name>
```

## tests

```bash
$ npm test
```

## API Doc

```bash
$ google-chrome docs/index.html
```

## Discovery expanations

```
$ NS=namespace PASS=access_password pm2 restart cloud-discovery
```

If **NS** is set it will activate the DNS Multicast discovery.
If **NS** and **PASS** is set, the DNS Multicast and DHT Bittorent discovery will be enabled.

## License

Apache V2 (see LICENSE.txt)



#
# Overview (old doc)
#

## Cloud Function

A cloud function is a simple script that will be executed over the network and will return a result to the calling script.

Example:

```javascript
module.exports = function(context, cb) {
  request(context.data.url, function (err, res, body) {
    if (error)
      return cb(error);
    return cb(null, body);
  });
};
```

## Automatic discovery

Each PM2 in the same subnet will auto discover themseleves via DNS multicast.

## Files & Env synchronization

The working directory will be automatically synchronized over the network.
One PM2 is the "file master" and all other peers will synchronize with these files.

The node_modules folder is also included on file broadcast. Data is transfered via a gziped tarball.

## Lambda management

PM2 is behind the scene to manage and cluster (if JS apps) tasks.

## Lambda in another language

To write a lambda in another language, you just need to create a HTTP server listening on port TASK_PORT on route / and returning the value needed:

Python:

```python
#!/usr/bin/python
from BaseHTTPServer import BaseHTTPRequestHandler,HTTPServer
import os

PORT_NUMBER = int(os.environ['TASK_PORT'])

class myHandler(BaseHTTPRequestHandler):
    #Handler for the GET requests
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/data')
        self.end_headers()
        self.wfile.write("Hello World !")
        return

server = HTTPServer(('', PORT_NUMBER), myHandler)
server.serve_forever()
```
