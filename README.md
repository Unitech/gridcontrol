
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

*Behind the scene: GridControl is a network layer built on top of PM2 allowing file synchronization, inter process communication via an opionated PUB/SUB system and a wide-range system discovery*

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

## Creating a Grid

Install your Army Swiss Knife to manage a Grid:

```bash
$ npm install grid-cli -g
```

Now the bin `grid` is available via the CLI.

### Commands

1/ Generate a new **Gridfile** in the current path that contains grid name, grid password, host and SSH keys:

```bash
$ grid new
```

The Gridfile will look like this:

```
grid_name     = 'grid-name'
grid_password = 'xxxx'

servers = [
  'user@ip1',
  'user@ip2',
  'user@ip3'
]

ssh_key = '''
1024_PRIVATE_SSH_KEY
'''

ssh_public_key = '''
PUBLIC_SSH_KEY
'''
```

Change each attribute with the desired value.

2/ Provision every hosts listed in the Gridfile:

```bash
$ grid provision
```

*This will copy the SSH pub key and install NVM, Node.js, PM2 and Gridcontrol*
*This installation does not need ROOT access rights at anytime*

3/ Grid management

```bash
# List all nodes linked to the grid
$ grid ls

# Display Dashboard
$ grid dash

# Execute a command on each server
$ grid multissh <bash_command>

# Restart/Recover the current Grid
$ grid restart

# Upgrade Gridcontrol to latest version
$ grid upgrade

# Display realtime logs of all tasks
$ grid logs

# Monitor the whole Grid with Keymetrics
$ grid monitor <secret> <public>

# Interactively SSH to desired machine
$ grid ssh
```

### Interact with the Grid

Now let's play with the Grid.
You can generate a sample project by typing:

```bash
$ grid sample [project-name]
$ cd [project-name]
$ npm install
```

You will get a project looking like this:

```
.
├── index.js
├── package.json
└── tasks
    └── get-ip.js
```

Let's look at the content of `tasks/get-ip.js`, this is a task that will be propagated in the grid:

```javascript
var request = require('request');

module.exports = function(context, cb) {
  request('https://api.ipify.org/?format=json', function (error, response, body) {
    if (error)
      return cb(error);

    if (!error && response.statusCode == 200) {
      return cb(null, body);
    }
  });
};
```

To call this function, look at how it is done in `index.js`:

```javascript
var grid = require('grid-api').init({
  instances   : 1,
  env         : {
    NODE_ENV  : 'development'
  }
});

function triggerTask() {
  grid.exec('get-ip', function(err, data, server) {
    if (err) {
      console.log(err);
      return false;
    }
	  console.log('Got response from server pub_ip=(%s) priv_ip=(%s):',
                server.public_ip,
                server.private_ip);
    console.log(data);
  });
}

grid.on('ready', function() {
  console.log('Gridcontrol Ready');
  setInterval(triggerTask, 1000);
});

```

Start the main application:

```bash
$ node index.js
```

At the beginning, only the local gridcontrol will respond. Once the other peers are synchronized they will also process the queries:

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

### Disable local tasks computation

To make the head node act as a load balancer only pass the `local : false` in `grid.init` options.

## Contributing

Please refer to [doc/CONTRIBUTING.md](doc/CONTRIBUTING.md)

## License

Apache V2 (see LICENSE.txt)
