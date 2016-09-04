#!/bin/bash
SRC=$(cd $(dirname "$0"); pwd)
source "${SRC}/include.sh"

export NODE_ENV='test'
export GRID='test-grid-scenario'

npm install pm2@next -g
pm2 install gridcontrol
npm install grid-cli -g

#
# Grid listing
#
grid ls
spec "should list process"
should "have one host listed" "local" 1

cd /tmp/

#
# Gridfile generation
#
grid new --force
ls Gridfile
[ $? -eq 0 ] || fail "Gridfile not generated"
success "Gridfile generated"

#sed -i 's/ubuntu@ip1/toto/g' Gridfile

#
# Sample Project Generation
#
rm -rf thegrid
grid sample thegrid
ls thegrid
[ $? -eq 0 ] || fail "Sample project FAILED"
success "Sample project SUCCEED"

sed -i '/grid_name/c\grid_name="siso"' Gridfile
grid restart
should "have one host listed" "siso" 1
