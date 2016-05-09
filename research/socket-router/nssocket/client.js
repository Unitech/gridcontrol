
var nssocket = require('nssocket');
var outbound = new nssocket.NsSocket({
  reconnect:true
});
outbound.data(['you', 'there'], function () {
  outbound.send(['iam', 'here'], { iam: true, indeedHere: true });
});

outbound.connect(6785);
