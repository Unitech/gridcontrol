
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var async = require('async');
var sshexec  = require('ssh-exec');
var moment = require('moment');
var chalk = require('chalk');
var EventEmitter = require('events');

var WinMode = {
  initUX : function(server_list) {
    var that = this;

    var screen = blessed.screen({
      title : 'SSH command result',
      smartCSR : true,
      autoPadding: true
    });

    var textbox = this.textbox = contrib.log({
      height : '100%',
      width: '80%',
      tags:true,
      border: 'line',
      label : 'Output',
      top: 0,
      left: 0,
      padding : 2,
      bufferLength : 100,
      style: {
        fg: 'blue',
        bg: 'default',
        selected: {
          bg: 'green',
          shadow : true
        }
      }
    });


    screen.append(textbox);


    var list = blessed.list({
      parent: screen,
      keys: true,
      vi: true,
      label : 'Server list',
      height : '100%',
      width: '20%',
      border: 'line',
      top: 0,
      right: 0,
      style: {
        fg: 'blue',
        bg: 'default',
        selected: {

        }
      }
    });

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

    list.focus();

    var current_server = server_list[0].hostname;

    that.log_emitter.on('log', function(data) {
      if (data.hostname == current_server)
        textbox.log(data.line);
    });

    var position = 0;

    list.on('keypress', function(ch, key) {
      if (key.name === 'down' && position < server_list.length)
        list.select(++position);
      else if (key.name == 'up' && position > 0)
        list.select(--position);

      var hostname = list.value;
      if (!hostname) return;
      current_server = hostname;
      textbox.logLines = [];
      that._stream_buffer[hostname].output.forEach(function(line) {
         textbox.log(line);
      });

      screen.render();
    });

    list.select(0);

    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      return process.exit(0);
    });

    screen.render();
  },
  formatOut : function(hostname, str) {
    var out = str.split('\n');
    var that = this;

    out.forEach(function(line) {
      if (line.length == 0) return;
      var l = '[' + moment().format('LTS') + '](' + hostname + ') ' + chalk.bold('$ ') + chalk.white(line);
      that.log_emitter.emit('log', {
        hostname : hostname,
        line : l
      });
      that._stream_buffer[hostname].output.push(l);
    });
  },
  exposeStream : function(scaleway, cmd) {
    this._stream_buffer = {};
    this.log_emitter = new EventEmitter();

    var that = this;

    this.initUX(scaleway.server_list);

    async.forEachLimit(scaleway.server_list, 20, function(server, next) {
      if (server.state != 'running') return next();

      //console.log('Executing', cmd, 'root@' + server.public_ip.address);
      var stream = sshexec("PS1='$ ' source ~/.bashrc; " + cmd, 'root@' + server.public_ip.address);

      that._stream_buffer[server.hostname] = {
        output : [],
        error : null,
        finished : false,
        started_at : new Date()
      };

      stream.on('warn', function(dt) {
        that.formatOut(server.hostname, dt.toString());
      });

      stream.on('data', function(dt) {
        that.formatOut(server.hostname, dt.toString());
      });

      stream.on('error', function(e) {
        that._stream_buffer[server.hostname].error = e;
      });

      stream.on('finish', function(code) {
        that._stream_buffer[server.hostname].finished = true;
        that._stream_buffer[server.hostname].exit_code = code;
        that.formatOut(server.hostname, chalk.bold(' \n \nTime total: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.hostname].started_at.getTime()) / 1000)) + 'secs\nExit code: ') + (code || 0));
        next();
      });
    }, function() {
      //console.log(that._stream_buffer);
    });
  }
};

module.exports = WinMode;



// i = 0;

// setInterval(function() {
//   const exec = require('child_process').exec;
//   const child = exec('ls');

//   textbox.logLines = [];

//   screen.render();
//   child.stdout.on('data', data => {
//     //console.log(data);

//     textbox.log("" + i++);
//     process.nextTick(function() {
//       //textbox.log(new Date*();
//       data.split('\n').forEach(function(dt) {
//         textbox.log(dt);
//       });
//     });
//     //screen.render();
//   });

//   child.stderr.on('data', data => {
//     textbox.log(new Date() + data);
//   });

//   child.on('close', function() {
//     //console.log(textbox.logLines);
//   });
// }, 100);


// setInterval(function() {
//   //textbox.log(new Date() + ' toto');

//   // var height = textbox.height - this.i.content.iheight;
//   // if (this.i.content._clines.length > height) {
//   //   this.i.logs.scroll(this.i.content._clines.length);
//   // }


//   //textbox.('asdads');
//   //console.log(map);
//   //serverList.addItem('toto');
// }, 100);
