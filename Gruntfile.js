module.exports = function(grunt) {
  require('matchdep').
    filterDev('grunt-*').
    filter(function(name){ return name !== 'grunt-cli'; }).
      forEach(grunt.loadNpmTasks);

  grunt.loadTasks('tasks');

  function config(configFileName) {
    return require('./configurations/' + configFileName);
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    env: process.env,

    clean: ["tmp", "dist/*"],

    transpile: config('transpile'),
    jshint: config('jshint'),
    concat: config('concat'),
    uglify: config('uglify'),
    copy: config('copy'),
    symlink: config('symlink'),

    'saucelabs-qunit': config('saucelabs-qunit'),

    connect: config('connect'),
    watch: config('watch'),
  });

  grunt.registerTask("jsframe", function(){
    var fs = require('fs'),
        jsf = require('jsframe'),
        out = fs.openSync('dist/oasis.js.html', 'w'),
        outMin = fs.openSync('dist/oasis.min.js.html', 'w');

    jsf.process('tmp/oasis.js', out);
    jsf.process('tmp/oasis.min.js', outMin);
  });
  grunt.registerTask('build', ['transpile', 'jshint', 'concat', 'uglify', 'jsframe', 'copy', 'symlink']);

  grunt.registerTask('default', ['build']);
  grunt.registerTask('server', ['connect', 'watch']);
  grunt.registerTask('test:ci', ['build', 'connect', 'saucelabs-qunit:all']);
};
