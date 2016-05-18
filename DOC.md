
# GridControl

GridControl provision and links a servers fleet togethers to form a *Grid*. Files are synchronized, pub/sub system is set, Servers get linked each other.

You develop, you play, in a scalable way. The more Servers you add to the Grid, the more calculation power you get.

<div align="center">
<b>Welcome to the Grid</b>
</div>

![http://img15.deviantart.net/82a3/i/2011/131/a/d/the_grid_by_cnunes-d3g4h8w.jpg](http://img15.deviantart.net/82a3/i/2011/131/a/d/the_grid_by_cnunes-d3g4h8w.jpg)

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
$ grid install <GRID_NAME>
```

To provision remote machines:

```bash
$ grid provision <USERNAME> <IP> <GRID_NAME>
```

This will SSH onto the server and will install and configure GridControl.
*GRID_NAME* is a common identifier for each node to link themselves.

Provision as many server as needed, then to list node in the grid:

```bash
$ grid list
```

To execute/install a software on each Grid's node do:

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

module.myHandler = function(data, cb) {
  request.get(data.url, function(err, res, body) {
    if (err) return cb(err);
    cb(null, { response : body });
  });
};
```

Now let's add some orchestration code into `index.js`:

```javascript
// Initialize and synchronize the whole grid
var grid = require('gridcontrol').init({
  task_folder : 'tasks'
});

setInterval(function() {

  /**
   * This will invoke the function <filename>.<handler> (fn name)
   * in each node connected, in a round robin way
   */
  grid.dispatch('request.myHandler', {
    url : 'http://google.com/'
  }, function(err, data, server_meta) {
    console.log('From server %s:%s', server.name, server.public_ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

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
