module.exports = {
  main: {
    type: "amd",
    files: [{
      expand: true,
      cwd: 'lib/',
      src: ['**/*.js'],
      dest: 'tmp/amd/'
    }, {
      expand: true,
      cwd: 'tmp/',
      src: ['oasis/**/*.js'],
      dest: 'tmp/amd/'
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
