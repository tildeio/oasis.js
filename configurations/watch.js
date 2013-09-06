module.exports = {
  all: {
    files: [
      'configurations/**',
      'lib/**',
      'test/**',
      'vendor/**'
    ],
    tasks: ['clean', 'lock', 'build', 'unlock'],
    options: {
      debounceDelay: 200
    }
  }
};
