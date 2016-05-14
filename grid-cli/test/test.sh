#!/bin/bash

SRC=$(cd $(dirname "$0"); pwd)
source "${SRC}/include.sh"

node="`type -P node`"
grid="`type -P node` `pwd`/bin/grid"

GRID_NAME="asdksaldk"

$grid init $GRID_NAME

$grid list
