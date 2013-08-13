module.exports = {
  main: {
    type: "amd",
    files: [{
      expand: true,
      cwd: 'lib/',
      src: ['**/*.js'],
      dest: 'tmp/oasis'
    }]
  },

  test: {
    type: "amd",
    files: [{
      expand: true,
      src: ['test/*.js'],
      dest: 'tmp'
    }]
  }
};
