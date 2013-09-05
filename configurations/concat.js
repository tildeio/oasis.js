module.exports = {
  amd: {
    src: ['tmp/amd/**/*.js'],
    dest: 'tmp/oasis.amd.js'
  },

  test: {
    src: [
      'vendor/loader.js',
      'vendor/**/*.js',
      'node_modules/rsvp/dist/*.amd.js',
      'tmp/oasis.amd.js',
      'tmp/test/**/*.js'
    ],
    dest: 'tmp/public/test.js'
  },

  browser: {
    src: [
      'vendor/loader.js',
      'vendor/**/*.js',
      'node_modules/rsvp/dist/*.amd.js',
      'tmp/oasis.amd.js'
    ],
    dest: 'tmp/oasis.js',
    options: {
      footer: "self.Oasis = requireModule('oasis'); self.Oasis.autoInitializeSandbox();"
    }
  }
};
