
# GridControl

Execute functions in a cloud of PM2s.

This modules auto-link all PM2s in the same network and allows to execute functions in any of them, in any languages.

The more *PM2* you add, the more calculation power you get.

## Quick start

### Softwares

- gridcontrol: Allow interconnection of PM2s
- gridcontrol-api: Module to send tasks among a grid of computer
- gridcontrol-cli: CLI utility to simplify provisioning of Peers

### Inter connect process managers

On multiple servers in the same private network (RPN, wifi...), type these two commands:

```bash
$ npm install pm2 -g
$ GRID=namespace PASS=pass pm2 install gridcontrol
```

Each gridcontrol linked to the same grid will connect each other. Discovery is made through DNS multicast and DHT Bittorent.

*To display cloud functions logs do `$ pm2 logs gridcontrol`*

### Create a base app

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

Now let's add some orchestration code into the index.js:

**./index.js**

```javascript
var grid = require('gridcontrol').init({
  task_folder : 'tasks'
});

setInterval(function() {

  /**
   * This will invoke the function <filename> (here request)
   * in each server connected in a round robin way
   */
  grid.dispatch('request', {
    url : 'http://google.com/'
  }, function(err, response, server_meta) {
    console.log('From server %s:%s', server.name, server.ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

Then create a folder called **tasks/** and add a first task into it:

**./tasks/request.js**

```javascript
var request = require('request');

module.exports = function(data, cb) {
  request.get(data.url, function(err, res, body) {
    if (err) return cb(err);
    cb(null, { response : body });
  });
};
```

Now start the main application:

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
