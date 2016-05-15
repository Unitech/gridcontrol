#!/bin/bash

mocha=`pwd`/node_modules/.bin/mocha

# Abort script at first error
set -e

export NODE_ENV test

$mocha test/task_manager.mocha.js
$mocha test/compress.mocha.js
$mocha test/file_manager.mocha.js
$mocha test/network.mocha.js
$mocha test/multi_tasks.mocha.js
$mocha test/tools.mocha.js
