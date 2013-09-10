module.exports = {
  all: {
    files: [
      'configurations/**',
      'lib/**',
      'test/**',
      'bower_components/**/*.js',
      'vendor/**'
    ],
    tasks: ['lock', 'build', 'unlock'],
    options: {
      debounceDelay: 200
    }
  }
};
