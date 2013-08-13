module.exports = {
  all: {
    // TODO: Run jshint on individual files when jshint supports ES6 modules
    src: [
      'tmp/amd/**/*.js',
      'tmp/test/*.js',
      'tmp/test/fixtures/**/*.js',
      'tmp/test/helpers/**/*.js',
      // There's one warning that we can't disable in here, grabbed from a
      // Mozilla polyfill.  Don't want to change `!=` to `!==` in a polyfill.
      '!tmp/test/helpers/shims.js'
    ],
    options: {
      jshintrc: '.jshintrc',
      force: true
    }
  }
};
