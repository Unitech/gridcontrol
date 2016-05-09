'use strict';

var subote = require('subote');
let source = new subote.Dispatcher();
let router = new subote.Router(socket);

router["/message/view"] = (data) => {
  console.log(`received: ${data}`);
};

source.register(router);

source.dispatch("/message/view", "hello!");
