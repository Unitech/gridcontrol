
# scaleway-commander

![Presentation commands](https://raw.githubusercontent.com/Unitech/scaleway-commander/master/pres.png)

## Install

```
$ npm install scaleway-commander -g
```

## Configure

Put access token into **~/.scaleway** (https://cloud.scaleway.com/#/credentials)

## Use

```
$ scw -h
```

## Commands

```
# List host
$ scw ls

# Constantly refresh server list and clear screen
$ scw ls --watch

# Interactively stop host
$ scw stop

# Interactively start host
$ scw start

# Interactively terminate host
$ scw start

# Interactively ssh to host
$ scw ssh

# SSH to all machine and execute command
$ scw sshall <cmd>
```
