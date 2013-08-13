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

  testOasis: {
    expand: true,
    cwd: 'dist',
    src: ['oasis.js.html'],
    dest: 'tmp/public/'
  }
};
