
# Welcome to the Grid

CLI for Gridcontrol distributed computing project.

## Install

-> export GRID_NAME GRID_PASS in env for easier plays

```bash
$ npm install grid-cli -g
```

Now the bin `grid` should be available via the CLI.

## Commands

Make sure SSH keys are set.

```bash
# Install a local node (required)
$ grid generate
```

Edit Gridfile

```bash
$ grid conf:provision Gridfile

$ grid ls --watch

# Execute a command (to install deps for example) on each node
$ grid multissh <bash_command>
```

-> Implement 127.0.0.1




```
# Provision a remote node
$ grid provision username ip <grid_name>

# Upgrade the whole grid to latest version
$ grid upgrade

# Display logs in realtime of all nodes
$ grid logs [task_name]

# Monitor all nodes with Keymetrics
$ grid monitor <secret_key> <public_key>

# Restart local node
$ grid restart
```

## Auth/Recovery

```
# Generate a hostfile with user:ip of each node
$ grid dump <hostfile>

# Generate SSH keypair (RSA2048)
$ grid keygen <key_name>

# Copy <key_name>.pub to all hosts listed in dump file
$ grid keycopy <hostfile>

# Recover the whole grid
$ grid recover <hostfile> <NEW_GRID_NAME> --key <key_name>.pub
```

## Features

- Provision target machine (install everything needed)
- List machines connected to the Grid
- Interactive UX

# License

Apache V2
