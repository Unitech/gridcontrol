#!/bin/bash

mocha=`pwd`/node_modules/.bin/mocha

export NODE_ENV test

$mocha test/task_manager.mocha.js
$mocha test/compress.mocha.js
$mocha test/file_manager.mocha.js
$mocha test/socket_router.mocha.js
$mocha test/network.mocha.js
$mocha test/multi_tasks.mocha.js
