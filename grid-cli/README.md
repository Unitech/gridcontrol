
# Gridcontrol CLI

CLI for Gridcontrol distributed computing project.

## Install

```bash
$ npm install grid-cli -g
```

Now the bin `grid` is available via the CLI.

## Commands

1/ Generate a new **Gridfile** in the current path, that contains grid name, grid password, host and SSH keys.

```bash
$ grid new
```

Change each attribute with the desired value.

2/ Provision every hosts listed in the Gridfile

```bash
$ grid provision
```

This will install:

- NVM
- Node.js
- PM2
- Gridcontrol node

3/ Play

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

Generate sample project in current folder:

```bash
$ grid sample <project-name>
```

# License

Apache V2
