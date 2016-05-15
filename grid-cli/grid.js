
var chalk = require('chalk');

var el = ['a', 'a', 'a', 'b', 'b', 'b'];

var min_size = 4;
var size = min_size;

if (Math.sqrt(el) > min_size) {
  size = Math.sqrt(el);
}

process.stdout.write('┌─');
for (var j = 0; j < size; j++) {
  process.stdout.write('──');
  if (j < size)
  process.stdout.write('┬');
}
process.stdout.write('─┐');
process.stdout.write('\n');

for (var i = 0; i < size; i++) {

  process.stdout.write('│');
  for (var j = 0; j < size; j++) {
    process.stdout.write(chalk.bgBlue('  ') + '|');
  }
  process.stdout.write('\n');

  process.stdout.write('├');
  for (var j = 0; j < size * 2 + 3; j++) {
    process.stdout.write('─');
  }
  process.stdout.write('┤');
  process.stdout.write('\n');
}
