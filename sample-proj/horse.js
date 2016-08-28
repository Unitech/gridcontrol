const Horseman = require('node-horseman');
const users = ['PhantomJS', 'nodejs'];

users.forEach((user) => {
  const horseman = new Horseman();
  horseman
    .open(`http://twitter.com/${user}`)
    .text('.ProfileNav-item--followers .ProfileNav-value')
    .then((text) => {
      console.log(`${user}: ${text}`);
    })
    .close(function() {
      console.log('done');
    });
});
