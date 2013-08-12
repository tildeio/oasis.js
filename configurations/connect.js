// TODO: read lockfile
module.exports = {
  options: {
    base: 'tmp/public',
    hostname: '*'
  },

  server: {
    options: {
      port: 8000
    }
  },

  childServer: {
    options: {
      port: 8001
    }
  },

  grandChildServer: {
    options: {
      port: 8003
    }
  }
};
