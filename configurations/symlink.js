module.exports = {
  test: {
    files: [{
      expand: true,
      cwd: 'tmp/public/',
      src: ['oasis.js.html'],
      dest: 'tmp/public/',
      ext: '-custom-url.js.html'
    }],
  }
};
