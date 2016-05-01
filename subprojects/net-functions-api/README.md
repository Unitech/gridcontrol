# Cloud function client

```
var cloudfunctions = require('cloudfunctions').conf({
  task_folder : 'tasks'
});

setInterval(function() {

  /**
   * This will invoke the function <filename> (here request)
   * in each server connected in a round robin way
   */
  client.invoke('request', {
    url : 'http://google.com/'
  }, function(err, response, server_meta) {
    console.log('From server %s:%s', server.name, server.ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

## API

```
.exec / .invoke(<task_name>, <data>, <cb>)
.listTasks(<cb>)
.listHosts(<cb>)
.stopTasks(<cb>)
.all(<task_name>, <data>, <eventemitter>
```
