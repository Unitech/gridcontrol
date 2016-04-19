
var request   = require('request');
var fs        = require('fs');
var Compress  = require('./compress.js');
var constants = require('../constants.js');

var FilesManagement = module.exports = {
  /**
   * Get route and pipe file to dest_file
   */
  retrieveFile : function(url, dest_file, cb) {
    var dest = fs.createWriteStream(dest_file);
    dest.on('close', cb);
    request.get(url).pipe(dest);
  },
  /**
   * Download + Unzip tarball from target_ip
   * (for slave to synchronize with file master)
   */
  synchronize : function(target_ip, cb) {
    var url = 'http://' + target_ip + ':10000/files/currentsync';
    var dest_file   = constants.TMP_FILE;
    var dest_folder = constants.TMP_FOLDER;

    this.retrieveFile(url, dest_file, function() {
      Compress.unpack(dest_file, dest_folder, function() {
        // Then call TaskManagement.initTaskGroup
        return cb();
      });
    });
  }
};
