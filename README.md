
<div align="center">
<img width=710px src="https://github.com/gridcontrol/gridcontrol/raw/master/logo.png">
</div>

# GridControl

GridControl provision and links multiple servers togethers to form a **Grid**.

Files are synchronized, Opionated Pub/Sub system is set, Servers get linked together.

You develop, you play, in a scalable way. The more Servers you add to the Grid, the more calculation power you get.

<div align="center">
<b>Welcome to the Grid</b>
<br/>
</div>

5 minutes to get started. By the authors of [PM2](https://github.com/Unitech/pm2).

*Behind the scene: GridControl is a network layer built on top of PM2 to allow file synchronization, that adds an opionated PUB/SUB system and a wide-range discovery system over... the whole internet*

## Features

- **0 conf** Auto discovery system via Bittorent DHT and DNS multicast
- **0 conf** Pandemic style application source sharing with dependencies and consistency checks
- **Ecosystem** Complete toolbox for Grid management (grid CLI, provisioning, multissh)
- **Decentralized** Each Nodes can trigger actions executed by another Nodes
- **Fast** Grid interconnected via TCP sockets
- **Fast** Services are started once, then stay alive waiting for inputs. This saves non-negligible startup time.
- **Polyglot** Services can be wrotte in any language
- **Compatible** with Amazon Lambda, Google Cloud Functions
- **Rock Solid** [PM2](https://github.com/Unitech/pm2) behind the scene for process management and cluster capabilities
- And a lot more like Buffering, Security, Retry on Failure...

## Quick start

The Grid CLI is your main tool to control a Grid:

```bash
$ npm install grid-cli -g
```

The binary `grid` is now available.

### Create a Compute Grid

On your local machine:

```bash
$ grid init <GRID_NAME>
```

To provision remote machines:

```bash
$ grid provision <USERNAME> <IP> <GRID_NAME>
```

This will SSH onto the server and will install and configure GridControl.
*GRID_NAME* is a common identifier for each node to link themselves.

Provision as many server as needed, then to list Nodes connected to the Grid:

```bash
$ grid list
```

To execute/install a software on each Grid's Node do:

```bash
$ grid multissh <COMMAND>
```

### Interact with the Grid

Now let's use the Grid.

We have to create a project with this structure:

```
.
├── index.js
├── package.json
└── tasks
    ├── task_1.js
    ├── task_2.js
    └── request.js
```

Let's look at the content of `tasks/request.js`:

```javascript
var request = require('request');

exports.myHandler = function(data, cb) {
  request.get(data.url, function(err, res, body) {
    if (err) return cb(err);
    cb(null, { response : body });
  });
};
```

Now let's add some orchestration code into `index.js`:

```javascript
var grid = require('gridcontrol');

// Initialize the grid
grid.init({
  task_folder : 'tasks'  // default to ./tasks/
  instances   : 2,       // instance per tasks, default to 'max'
  env : {                // Extra environment variables to pass to tasks
    TOKEN_SERVICE_X : 'xxxxxxx',
    NODE_ENV : 'production'
  }
});

setInterval(function() {

  // Dispatch action <filename>.<handler> into the grid
  // and retrieve response
  grid.dispatch('request.myHandler', {
    url : 'http://google.com/'
  }, function(err, data, server_meta) {
    console.log('From server %s:%s', server.name, server.public_ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

*For more documentation about the api please refer to grid-api/README.md

Start the main application:

```bash
$ node index.js
```

## More...

Display each Node connected to the grid:

```bash
$ grid list
```

Display all Node's logs:

```bash
$ grid logs
```

Upgrade all Nodes to latest GridcontroL

```bash
$ grid upgrade
```

Monitor all Nodes with [keymetrics.io](https://keymetrics.io):

```bash
$ grid monitor <secret_keymetrics> <public_keymetrics>
```

Move all Nodes to another Grid:

```bash
$ grid move <new_grid_name>
```

## Contributing/Tests/API Documentation

Please refer to [doc/CONTRIBUTING.md](doc/CONTRIBUTING.md)

## License

Apache V2 (see LICENSE.txt)
