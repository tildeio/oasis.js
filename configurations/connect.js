// TODO: read lockfile
var port = parseInt(process.env.PORT || 8000, 10);

module.exports = {
  options: {
    base: 'tmp/public',
    hostname: '*'
  },

  server: {
    options: {
      port: port,
    }
  },

  childServer: {
    options: {
      port: port + 1,
    }
  },

  grandChildServer: {
    options: {
      port: port + 3,
    }
  }
};
