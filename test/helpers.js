
var exec = require('child_process').exec;
var child;

var Helper = module.exports = {
  rmdir : function(folder, cb) {
    exec('rm -rf ' + folder, function(err, stdout, stderr) {
      cb();
    });
  },
  walkSync : function walkSync(dir, filelist) {
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
      if (fs.statSync(dir + '/' + file).isDirectory()) {
        filelist = walkSync(dir + '/' + file, filelist);
      }
      else {
        filelist.push(file);
      }
    });
    return filelist;
  }
}
