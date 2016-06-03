
<div align="center">
<img width=560px src="https://github.com/gridcontrol/gridcontrol/raw/master/logo2.png">
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

*Behind the scene: GridControl is a network layer built on top of PM2 to allow file synchronization, that adds an opionated PUB/SUB system and a wide-range discovery*

## Features

- **0 conf** Auto discovery system via multiple DNS
- **0 conf** P2P application source sharing
- **Ecosystem** Grid management toolbox (CLI, provisioning, Logs, Monitoring)
- **Secure** Diffie Hellman key exchange and password authentication
- **Decentralized** Each Nodes can trigger actions executed by another Nodes
- **Fast** Grid interconnected via TCP sockets
- **Fast** Services are started once, then stay alive waiting for inputs. This saves non-negligible startup time
- **Polyglot** Services can be wrotte in any language
- **Compatible** with Amazon Lambda, Google Cloud Functions
- **Rock Solid** [PM2](https://github.com/Unitech/pm2) behind the scene for process management and cluster capabilities
- And a lot more like Buffering, Retry on Failure...

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

*This will install PM2 and Gridcontrol module*

To provision remote machines:

```bash
$ grid provision <USERNAME> <IP> <GRID_NAME>
```

*This will SSH onto the server and will install and configure GridControl with the specified GRID NAME*
*GRID_NAME* is a common identifier for each node to link themselves.

Provision as many server as needed, then to list Nodes connected to the Grid:

```bash
$ grid list
```

To execute/install a software on each Grid's Node just do:

```bash
$ grid spread <COMMAND>
```

### Interact with the Grid

Now let's play with the Grid.

We have to create a project with this basic structure:

```
.
├── index.js
├── package.json
└── tasks
    └── getURL.js
```

Let's look at the content of `tasks/getUrl.js`:

```javascript
var request = require('request');

// this function, called 'getUrl.myHandler', is now exposed over the wire
exports.myHandler = function(data, cb) {

  // Get the HTML content of the specified url
  request.get(data.url, function(err, res, body) {
    if (err) return cb(err);

    // Then return the result
    cb(null, { response : body });
  });
};
```

Now let's call this function from our main file, `index.js`:

```javascript
var grid = require('grid-api');

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

  // Dispatch the action <filename>.<handler> into the grid
  // and retrieve response
  grid.dispatch('getUrl.myHandler', {
    url : 'http://google.com/'
  }, function(err, data, server_meta) {
    console.log('From server %s:%s', server.name, server.public_ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

*For more documentation about the api please refer to grid-api/README.md*

Start the main application:

```bash
$ node index.js
```

If the grid has 4 Nodes (including local) you will get this result:

```
From server alor-vital:88.123.12.21
Got response $HTML
From server xtreme-ventage:5.10.123.144
Got response $HTML
From server veolia-graphia:88.125.120.20
Got response $HTML
From server hector-castor:120.12.1.145
Got response $HTML
```

Distributed processing, on-premise!

## Advanced management

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

## Advanced documentation

### Ignoring files for synchronization

Avoid re synchronizing the application in case of some file changes by adding a `.gridignore` file, containing a list of regex/files to ignore separated by a newline.

### Password protection

To add a password to your grid export the environment variable GRID_AUTH with the desired password.

```bash
$ export GRID_AUTH='password'
$ grid restart
```

### Default GRID name

To avoid setting a grid name for each command export the environment variable GRID

```bash
$ export GRID='grid_name'
$ grid restart
```

## Contributing

Please refer to [doc/CONTRIBUTING.md](doc/CONTRIBUTING.md)

## License

Apache V2 (see LICENSE.txt)
