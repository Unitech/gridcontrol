#!/bin/bash

SRC=$(cd $(dirname "$0"); pwd)
source "${SRC}/include.sh"

export NODE_ENV='test'

node="`type -P node`"
grid="`type -P node` `pwd`/bin/grid"

GRID_NAME="TEST-GRID-TEST"

$grid init $GRID_NAME
spec "should init grid"

source "${SRC}/include.sh"

pm2should 'pm2 have 1 app running' 'online' 1

$grid list

pm2should 'pm2 has process restarted 0 time' 'restart_time: 0' 1

# RESTART GRID
$grid restart

pm2should 'pm2 has process restarted 1 time' 'restart_time: 1' 1

# RESTART GRID
echo 'Reseting grid (delete all processes + restart gridcontrol)'
$grid reset

# MOVE GRID
$grid move 'new:grid'

# DISPLAY LOGS
$grid logs &
PID=$!
sleep 5
kill $PID

# LIST TASKS
$grid list-tasks
spec "Should list tasks"

# MULTISSH
$grid spread "ls -l"
spec "Should execute a command"

# SSH key generation
$grid keygen testkeyset --no-chmod
ls testkeyset
spec "Private key should exists"
rm testkeyset

ls testkeyset.pub
spec "Public key should exists"
rm testkeyset.pub

# Dump
$grid dump grid-test
HOSTFILE=`cat grid-test.hostfile | wc -l`
[ $HOSTFILE -eq 1 ] || fail "$1"
success "File contain right dump data"
rm grid-test.hostfile

# UNPROVISION
echo 'uninstall gridcontrol'
$grid unprovision
spec "uninstall gridcontrol"

pm2should 'pm2 have 0 app running' 'online' 0
