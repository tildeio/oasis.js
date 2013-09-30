module.exports = {
  all: {
    src: [
      'lib/**/*.js',
      'test/*.js',
      'test/fixtures/**/*.js',
      'test/helpers/**/*.js',
      // There's one warning that we can't disable in here, grabbed from a
      // Mozilla polyfill.  Don't want to change `!=` to `!==` in a polyfill.
      '!test/helpers/shims.js',
      '!lib/oasis/shims.js'
    ],
    options: {
      jshintrc: '.jshintrc',
      force: true
    }
  }
};
