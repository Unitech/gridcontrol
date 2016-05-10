# Cloud function client

```javascript
var grid = require('gridcontrol').init({
  task_folder : 'tasks',
  instances   : 2,        // Number of instances of each tasks
  env         : {         // Extra environment variables spread on Grid
    EXTRA : "ENV"
  }
});

setInterval(function() {

  /**
   * This will invoke the function <filename> (here request)
   * in each server connected in a round robin way
   */
  grid.dispatch('request', {
    url : 'http://google.com/'
  }, function(err, response, server_meta) {
    console.log('From server %s:%s', server.name, server.ip);
    console.log('Got response %s', data);
  });

}, 1000);
```

## Timeout

```javascript
  grid.dispatch('request', {
    url : 'http://google.com/'
  }, {
    timeout : 5000
  }, function(err, response, server_meta) {
    console.log('From server %s:%s', server.name, server.ip);
    console.log('Got response %s', data);
  });
```

## API

```
.init(<opts>, <cb>)
.exec / .invoke(<task_name>, <data>, <cb>)
.listTasks(<cb>)
.listProcessingTasks(<cb>)
.listHosts(<cb>)
.stopTasks(<cb>)
.all(<task_name>, <data>, <eventemitter>
```
