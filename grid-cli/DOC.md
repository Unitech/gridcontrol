
# Welcome to the Grid

CLI for Gridcontrol distributed computing project.

## Install

```bash
$ npm install grid-cli -g
```

Now the bin `grid` should be available via the CLI.

## Commands

Make sure SSH keys are set.

```bash
# Install a local node (required)
$ grid init <grid_name>

# Provision a remote node
$ grid provision username ip <grid_name>

# Upgrade the whole grid to latest version
$ grid upgrade

# List all node in Grid
$ grid list
$ grid ls --watch

# List running tasks on all nodes
$ grid tasks

# Display logs in realtime of all nodes
$ grid logs [task_name]

# Monitor all nodes with Keymetrics
$ grid monitor <secret_key> <public_key>

# Restart local node
$ grid restart

# Move all server to another grid
$ grid move <new_grid_name>

# Execute a command (to install deps for example) on each node
$ grid spread <bash_command>
```


## Features

- Provision target machine (install everything needed)
- List machines connected to the Grid
- Interactive UX

# License

Apache V2
