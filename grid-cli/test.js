

var sshExec = require('ssh-exec');

sshExec('ls -l', {
  host : '163.172.151.155',
  user : 'root'
});
