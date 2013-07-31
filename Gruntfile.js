module.exports = function(grunt) {
	var browsers = [{
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
	},{
		browserName: 'internet explorer',
		version: '10',
		platform: 'Windows 8'
	},{
		browserName: 'internet explorer',
		version: '9',
		platform: 'Windows 7'
	},{
		browserName: 'internet explorer',
		version: '8',
		platform: 'Windows 7'
	}];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      options: {
        base: 'tmp/tests',
        hostname: '*'
      },

      server: {
        options: {
          port: 8000
        }
      },

      childServer: {
        options: {
          port: 8001
        }
      },

      grandChildServer: {
        options: {
          port: 8003
        }
      }
    },

    watch: {
      files: ['lib/**', 'test/**'],
      tasks: ['shell', 'copy']
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
					build: process.env.TRAVIS_BUILD_NUMBER,
					concurrency: 3,
					browsers: browsers,
					testname: "Oasis.js qunit tests",
          testTimeout: 3 * 60 * 1000,
          testInterval: 5000
        }
      }
    },

    shell: {
      build: {
        command: 'bundle exec rakep build'
      }
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('saucelabs', ['copy', 'connect', 'saucelabs-qunit:all']);
  grunt.registerTask('default', ['server']);
  grunt.registerTask('server', ['copy', 'connect', 'watch']);
};
