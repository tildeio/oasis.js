module.exports = {
  amd: {
    src: ['tmp/oasis/**/*.js'],
    dest: 'tmp/oasis.amd.js'
  },

  test: {
    src: [
      'vendor/loader.js',
      'vendor/**/*.js',
      'tmp/oasis.amd.js',
      'tmp/test/**/*.js'
    ],
    dest: 'tmp/public/test.js'
  },

  browser: {
    src: [
      'vendor/loader.js',
      'vendor/**/*.js',
      'tmp/oasis.amd.js'
    ],
    dest: 'tmp/oasis.js',
    options: {
      footer: "self.Oasis = requireModule('oasis');"
    }
  }
};
