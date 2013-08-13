module.exports = function(grunt) {
  var path = require('path');

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

  grunt.registerTask("jst", function () {
    grunt.file.expand({ cwd: 'template/' }, '**/*.jst').forEach(function(templatePath) {
      var dir = path.dirname(templatePath),
          base = path.basename(templatePath, path.extname(templatePath));

      grunt.file.mkdir(path.join('tmp', dir));
      grunt.file.write(path.join('tmp', dir, base + '.js'), grunt.template.process(grunt.file.read('template/' + templatePath)));
    });
  });

  grunt.registerTask("jsframe", function(){
    var fs = require('fs'),
        jsf = require('jsframe'),
        out = fs.openSync('dist/oasis.js.html', 'w'),
        outMin = fs.openSync('dist/oasis.min.js.html', 'w');

    jsf.process('tmp/oasis.js', out);
    jsf.process('tmp/oasis.min.js', outMin);
  });
  grunt.registerTask('build', ['jst', 'transpile', 'jshint', 'concat', 'uglify', 'jsframe', 'copy', 'symlink']);

  grunt.registerTask('default', ['build']);
  grunt.registerTask('server', ['connect', 'watch']);
  grunt.registerTask('test:ci', ['build', 'connect', 'saucelabs-qunit:all']);
};
