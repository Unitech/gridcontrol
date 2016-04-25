
# PM2 CloudFunctions

Execute functions in a cloud of PM2s.

This modules auto-link all PM2s in the same network and allows to execute functions in any of them, in any languages.

The more *PM2* you add, the more calculation power you get.

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

```
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
