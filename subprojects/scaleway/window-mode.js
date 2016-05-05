
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var screen = blessed.screen({
  title : 'SSH command result'
});


var textbox = blessed.textbox({
  parent: screen,
  height : '100%',
  width: '80%',
  border: 'line',
  title : 'Output',
  top: 0,
  left: 0,
  style: {
    fg: 'blue',
    bg: 'default',
    selected: {
      bg: 'green'
    }
  }
});

// var map = grid.set(0, 0, 12, 9, blessed.log, {
//   content: 'Servers Locationasd '
// });

var list = blessed.list({
  parent: screen,
  keys: true,
  vi: true,
  height : '100%',
  width: '20%',
  border: 'line',
  top: 0,
  right: 0,
  style: {
    fg: 'blue',
    bg: 'default',
    selected: {
      bg: 'green'
    }
  },
  items : [
    'one',
    'two',
    'three'
  ]
});

list.focus();

list.select(0);

list.on('select', function(item) {
  console.log(item.getText());
  screen.destroy();
});



setInterval(function() {
  //console.log(map);
  //serverList.addItem('toto');
}, 500);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

screen.render();
