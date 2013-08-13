module.exports = {
  all: {
    files: [
      'configurations/**',
      'lib/**',
      'test/**'
    ],
    tasks: ['lock', 'build', 'unlock'],
    options: {
      debounceDelay: 200
    }
  }
};
