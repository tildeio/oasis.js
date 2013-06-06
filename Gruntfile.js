module.exports = function(grunt) {
	var browsers = [{
		browserName: 'internet explorer',
		version: '8',
		platform: 'Windows XP'
	},{
		browserName: 'internet explorer',
		version: '9',
		platform: 'Windows 7'
	},{
		browserName: 'internet explorer',
		version: '10',
		platform: 'Windows 8'
	},{
		browserName: 'chrome',
		version: '27',
		platform: 'Windows 8'
	},{
		browserName: 'firefox',
		version: '21',
		platform: 'Windows 8'
	},{
		browserName: 'safari',
		version: '6',
		platform: 'OS X 10.8'
	}
  ];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {},

      options: {
        port: 8000,
        base: 'tmp/tests'
      }
    },

    watch: {
      files: ['lib/**', 'vendor/*', 'test/tests/*'],
      tasks: []
    },

    copy: {
      main: {
        files: [
          {expand: true, cwd: 'dist/', src: ['**'], dest: 'tmp/tests/'}, // includes files in path
          {expand: true, cwd: 'test/', src: ['**'], dest: 'tmp/tests/'} // includes files in path
        ]
      }
    },

    'saucelabs-qunit': {
      all: {
        options: {
          urls: [
            'http://localhost:8000/index.html'
          ],
          tunnelTimeout: 5,
					build: process.env.TRAVIS_JOB_ID,
					concurrency: 3,
					browsers: browsers,
					testname: "qunit tests",
          testTimeout: 15000,
          testInterval: 5000
        }
      }
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-saucelabs');

  grunt.registerTask('test', ['copy', 'connect', 'saucelabs-qunit']);
	grunt.registerTask('default', ['test']);
	grunt.registerTask('server', ['copy', 'connect', 'watch']);
};
