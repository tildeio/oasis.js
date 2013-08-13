var lockFile = require('lockfile');

module.exports = function(grunt) {
  grunt.registerTask('lock', 'Set semaphore for connect server to wait on.', function() {
    grunt.file.mkdir('tmp');
    lockFile.lockSync('tmp/connect.lock');
  });

  grunt.registerTask('unlock', 'Release semaphore that connect server waits on.', function() {

    var lockPath = 'tmp/connect.lock';

    if (!lockFile.checkSync(lockPath)) {
      throw new Error("Tried to unlock, but there was no lock.");
    }

    lockFile.unlockSync(lockPath);
  });
};
