
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var gridapi = require('grid-api');
var pm2     = require('pm2');

//create layout and widgets

const BOX_BORDER = {
  type: "line",
  fg: "cyan"
};

var Dashboard = {
  init : () => {
    this.screen = blessed.screen({
      smartCSR   : true,
      autoPadding: true
    })

    setInterval(() => {
      this.screen.render();
    }, 500);

    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.screen.destroy();
      process.exit(0);
    });
  },
  populateHosts : () => {
    var table = contrib.table({
      fg: 'white',
      parent : this.screen,
      label: 'Grid elements',
      selectedBg: 'black',
      top : 0,
      left : 0,
      width: '50%',
      height: '50%',
      border: BOX_BORDER,
      columnWidth: [20, 15, 12, 20]
    })

    function getShowHosts() {
      gridapi.listHosts((err, data) => {
        if (err) return console.error(err);

        var dt = [];
        data.forEach((host) => {
          dt.push([
            host.name,
            host.public_ip,
            host.synchronized + '',
            host.uptime
          ]);
        });

        table.setData({
          headers: ['Node name', 'Public IP', 'Synchronized', 'Uptime'],
          data: dt
        })
      });
    }

    setInterval(() => {
      getShowHosts();
    }, 1000);
  },
  mountPM2Stats : () => {
    var log = contrib.log({
      parent     : this.screen,
      left       : 0,
      top        : '50%',
      width      : '50%',
      height     : '50%',
      fg         : "green",
      selectedFg : "green",
      label      : 'Local Gridcontrol logs',
      border     : BOX_BORDER
    });

    pm2.connect((err) => {
      if (err) return console.error(err);
      pm2.launchBus((err, bus) => {
        bus.on('log:*', (type, data) => {
          log.log(data.at + ' ' + data.process.name + ': ' + data.data);
        });
      });
    });
  },
  displayCurrentProcessingTasks : () => {
    var table = contrib.table({
      fg: 'white',
      parent : this.screen,
      label: 'Tasks being processed',
      selectedBg: 'black',
      top : '50%',
      left : '50%',
      width: '50%',
      height: '50%',
      border: BOX_BORDER,
      columnWidth: [20, 15, 15]
    })

    function getShowTasks() {
      gridapi.listProcessingTasks((err, data) => {
        if (err) return console.error(err);

        var dt = [];
        data.forEach((task) => {
          dt.push([
            task.task_id,
            task.started_at,
            task.peer_info.name
          ]);
        });

        table.setData({
          headers: ['Task Name', 'Time spent', 'Process. Node'],
          data: dt
        })
      });
    }

    setInterval(() => {
      getShowTasks();
    }, 1000);
  },
  displayTasksStats : () => {
    var table = contrib.table({
      fg: 'white',
      parent : this.screen,
      label: 'Tasks stats',
      selectedBg: 'black',
      top : 0,
      left : '50%',
      width: '50%',
      height: '50%',
      border: BOX_BORDER,
      columnWidth: [10, 10, 10, 10, 10]
    })

    function getShowTasks() {
      gridapi.listTasksStats((err, data) => {
        if (err) return console.error(err);

        var dt = [];
        Object.keys(data).forEach((task_name) => {
          dt.push([
            task_name,
            data[task_name].invokations,
            data[task_name].success,
            data[task_name].errors,
            data[task_name].remote_invok
          ]);
        });

        table.setData({
          headers: ['Task Name', 'Tot. Invok.', 'Success', 'Errors', 'Remote'],
          data: dt
        })
      });
    }

    setInterval(() => {
      getShowTasks();
    }, 1000);
  }
};

Dashboard.init();
Dashboard.displayCurrentProcessingTasks();
Dashboard.displayTasksStats();
Dashboard.populateHosts();
Dashboard.mountPM2Stats();
