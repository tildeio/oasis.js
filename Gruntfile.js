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
    shell: config('shell'),
    symlink: config('symlink'),

    'saucelabs-qunit': config('saucelabs-qunit'),

    connect: config('connect'),
    watch: config('watch')
  });

  grunt.registerTask("jst", function () {
    grunt.file.expand({ cwd: 'template/' }, '**/*.jst').forEach(function(templatePath) {
      var dir = path.dirname(templatePath),
          base = path.basename(templatePath, path.extname(templatePath));

      grunt.file.mkdir(path.join('tmp', dir));
      grunt.file.write(path.join('tmp', dir, base + '.js'), grunt.template.process(grunt.file.read('template/' + templatePath)));
    });
  });

  grunt.registerTask('build', ['jst', 'transpile', 'jshint', 'concat', 'uglify', 'copy', 'symlink']);

  grunt.registerTask('default', ['shell:npmInstall', 'build']);
  grunt.registerTask('server', ['shell:npmInstall', 'build', 'connect', 'watch']);

  grunt.registerTask('test:ci', ['shell:npmInstall', 'build', 'connect', 'saucelabs-qunit']);

  grunt.registerTask('test:ie', ['shell:npmInstall', 'build', 'connect', 'saucelabs-qunit:ie']);
};
