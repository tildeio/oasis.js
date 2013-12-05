module.exports = {
  amd: {
    src: ['tmp/oasis.amd.js'],
    dest: 'dist/oasis.amd.js'
  },

  test: {
    expand: true,
    cwd: 'test',
    src: [
      '**/*',
      '!*.js'
    ],
    dest: 'tmp/public/'
  },

  testVendor: {
    expand: true,
    cwd: 'bower_components',
    src: [
      'qunit/qunit/*',
      'jquery/jquery.js'
    ],
    flatten: true,
    dest: 'tmp/public/vendor/'
  },

  testOasis: {
    expand: true,
    cwd: 'dist',
    src: ['oasis.js'],
    dest: 'tmp/public/'
  }
};
