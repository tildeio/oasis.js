module.exports = {
  all: {
    files: [
      'configurations/**',
      'lib/**',
      'test/**',
      'vendor/**'
    ],
    tasks: ['lock', 'build', 'unlock'],
    options: {
      debounceDelay: 200
    }
  }
};
