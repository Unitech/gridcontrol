var baudio = require('baudio');
var oscillate = require('boscillate');

var n = 0;
var b = baudio(function (t, i) {
  return Math.sin(t * 400 * Math.PI * 2) + Math.sin(t * 500) * (t % 2 > 1);
});


b = oscillate(b);
b.play();
