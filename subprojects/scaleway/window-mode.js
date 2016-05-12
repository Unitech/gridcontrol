
var blessed      = require('blessed');
var async        = require('async');
var sshexec      = require('ssh-exec');
var moment       = require('moment');
var chalk        = require('chalk');
var EventEmitter = require('events');
var pkg          = require('./package.json');

var WinMode = {
  initUX : function(server_list, cmd) {
    var that = this;

    var screen = this.screen = blessed.screen({
      smartCSR : true,
      autoPadding: true,
      title : 'MultiSSH ' + pkg.version + ' $ ' + cmd
    });

    var textbox = this.textbox = blessed.list({
      parent: screen,
      height : '100%',
      width: '80%+1',
      border: 'line',
      label : chalk.bold(' MultiSSH ' + pkg.version) + ': SSH command result ',
      top: 0,
      left: 0,
      padding : 2,
      style : {
        border: {
          fg: 'cyan',
          bold : true
        }
      }
    });

    var text = blessed.table({
      parent: screen,
      keys: true,
      label : chalk.bold(' Helper '),
      width: '20%',
      border: 'line',
      bottom: 0,
      right: 0,
      style: {
        fg: 'white',
        bg: 'default',
        border: {
          fg: 'cyan',
          bold : true
        },
        selected: {
        }
      }
    });

    text.setData([
      ['Command', '$ ' + chalk.bold(cmd) ],
      ['Key up', 'Select prev server'],
      ['Key down', 'Select next server'],
      [ 'Ctrl-c', 'Exit MultiSSH']
    ]);
    // text.setContent('Curr. Command: $ ' + chalk.bold(cmd) + '\n\n' +
    //                 'Key up: Select prev server\n' +
    //                 'Key down: Select next server\n' +
    //                 'Ctrl-c: Exit MultiSSH\n');

    var list = blessed.list({
      parent: screen,
      keys: true,
      label : chalk.bold(' Server list '),
      height : '85%',
      width: '20%',
      border: 'line',
      top: 0,
      right: 0,
      style: {
        fg: 'white',
        bg: 'default',
        border: {
          fg: 'cyan',
          bold : true
        },
        selected: {
        }
      }
    });

    list.focus();

    var position = 0;

    list.on('keypress', function(ch, key) {
      if (key.name === 'down' && position < server_list.length)
        list.select(++position);
      else if (key.name == 'up' && position > 0)
        list.select(--position);

      var hostname = list.value;
      if (!hostname) return;
      current_server = hostname;
      textbox.setItems(that._stream_buffer[hostname].output);
      screen.render();
    });

    list.select(0);

    setInterval(function() {
      list.clearItems();

      server_list.forEach(function(server) {
        var server_str = '';

        if (that._stream_buffer[server.hostname].error)
          server_str = chalk.bold.red(server.hostname);
        else if (that._stream_buffer[server.hostname].finished)
          server_str = chalk.bold.green(server.hostname);
        else
          server_str = chalk.bold.blue(server.hostname);

        list.pushItem(server_str);
      });

      list.select(position);
      screen.render();
    }, 200);

    var current_server = server_list[0].hostname;

    that.log_emitter.on('log', function(data) {
      if (data.hostname == current_server) {
        textbox.setItems(that._stream_buffer[current_server].output);
        textbox.scrollTo(that._stream_buffer[current_server].output.length);
      }
    });

    screen.render();
  },
  getLine : function(hostname, str) {
    return '[' + moment().format('LTS') + '](' + hostname + ') ' + str;
  },
  formatOut : function(hostname, str, error) {
    var out = str.split('\n');
    var that = this;

    out.forEach(function(line) {
      if (line.length == 0) return;
      var l = '[' + moment().format('LTS') + '](' + hostname + ') ';
      if (error)
        l += chalk.red(line);
      else
        l += line;
      that.log_emitter.emit('log', {
        hostname : hostname,
        line : l
      });
      that._stream_buffer[hostname].output.push(l);
    });
  },
  start : function(server_list, cmd, cb) {
    this._stream_buffer = {};
    this.log_emitter = new EventEmitter();

    var that = this;

    this.initUX(server_list, cmd);

    this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      return cb ? cb() : process.exit(0);
    });

    process.nextTick(function() {
      that.textbox.addItem(that.getLine(server_list[0].hostname, '$ ' + cmd));
    });

    async.forEachLimit(server_list, 20, function(server, next) {
      if (server.state && server.state != 'running') return next();

      var stream = sshexec("PS1='$ ' source ~/.bashrc; " + cmd,  server.user + '@' + server.ip);

      that._stream_buffer[server.hostname] = {
        output : [],
        error : null,
        finished : false,
        started_at : new Date()
      };
      that.formatOut(server.hostname, '$ ' + cmd);

      stream.on('warn', function(dt) {
        that.formatOut(server.hostname, dt.toString());
      });

      stream.on('data', function(dt) {
        that.formatOut(server.hostname, dt.toString());
      });

      stream.on('error', function(e) {
        that.formatOut(server.hostname, e.message || e, true);
        that._stream_buffer[server.hostname].error = e;
        that._stream_buffer[server.hostname].finished = true;
        that.formatOut(server.hostname, chalk.bold('Command Finished with Error\nDuration: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.hostname].started_at.getTime()) / 1000)) + 'secs'));
      });

      stream.on('finish', function(code) {
        that._stream_buffer[server.hostname].finished = true;
        that._stream_buffer[server.hostname].exit_code = code;
        that.formatOut(server.hostname, chalk.bold(' \n \nDuration: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.hostname].started_at.getTime()) / 1000)) + 'secs\nExit code: ') + (code || 0));
        next();
      });
    }, function() {
      //console.log(that._stream_buffer);
    });
  }
};

module.exports = WinMode;
