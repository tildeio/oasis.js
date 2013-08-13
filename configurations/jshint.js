module.exports = {
  all: {
    // TODO: Run jshint on individual files when jshint supports ES6 modules
    src: [
      'tmp/oasis/**/*.js',
      'tmp/test/**/*.js',
      // There's one warning that we can't disable in here, grabbed from a
      // Mozilla polyfill.  Don't want to change `!=` to `!==` in a polyfill.
      '!tmp/test/test_helpers.js'
    ],
    options: {
      jshintrc: '.jshintrc',
      force: true
    }
  }
};
