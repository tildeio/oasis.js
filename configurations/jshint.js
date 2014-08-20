module.exports = {
  all: {
    src: [
      'lib/**/*.js',
      'test/*.js',
      'test/fixtures/**/*.js',
      'test/helpers/**/*.js'
    ],
    options: {
      jshintrc: '.jshintrc',
      force: true
    }
  }
};
