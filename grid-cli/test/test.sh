#!/bin/bash

SRC=$(cd $(dirname "$0"); pwd)
source "${SRC}/include.sh"

node="`type -P node`"
grid="`type -P node` `pwd`/bin/grid"

GRID_NAME="asdksaldk"

$grid init $GRID_NAME
spec "should init grid"


# PM2 is Armed
# pm2="`type -P node` `pwd`/bin/pm2"
source "${SRC}/include.sh"

pm2should 'pm2 have 1 app running' 'online' 1

$grid list

pm2should 'pm2 has process restarted 0 time' 'restart_time: 0' 1

# RESTART GRID
$grid restart &
PID=$!
sleep 2
kill $PID

pm2should 'pm2 has process restarted 1 time' 'restart_time: 1' 1

# RESTART GRID
echo 'Reseting grid (delete all processes + restart gridcontrol)'
$grid reset &
PID=$!
sleep 2
kill $PID

# MOVE GRID
$grid move 'new:grid' &
PID=$!
sleep 2
kill $PID

# DISPLAY LOGS
$grid logs &
PID=$!
sleep 2
kill $PID

# LIST TASKS
$grid list-tasks &
PID=$!
sleep 2
kill $PID
spec "Should list tasks"

# MULTISSH
$grid spread "ls -l" &
PID=$!
sleep 2
kill $PID
spec "Should list tasks"

# # UPGRADE
# $grid upgrade &
# PID=$!
# sleep 2
# kill $PID
# spec "Should list tasks"

# UNPROVISION
echo 'uninstall gridcontrol'
$grid unprovision &
PID=$!
sleep 2
kill $PID
spec "uninstall gridcontrol"

pm2should 'pm2 have 0 app running' 'online' 0
