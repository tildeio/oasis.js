var vendorSources = [
  'vendor/loader.js',
  'vendor/**/*.js',
  'bower_components/UUID.js/dist/uuid.core.js',
  'bower_components/kamino.js/lib/kamino.js',
  'bower_components/MessageChannel.js/lib/message_channel.js',
  'node_modules/rsvp/dist/*.amd.js'
];

module.exports = {
  amd: {
    src: ['tmp/amd/**/*.js'],
    dest: 'dist/oasis.amd.js'
  },

  test: {
    src: vendorSources.concat([
      'dist/oasis.amd.js',
      'tmp/test/**/*.js'
    ]),
    dest: 'tmp/public/test.js'
  },

  browser: {
    src: vendorSources.concat([
      'dist/oasis.amd.js'
    ]),
    dest: 'dist/oasis.js',
    options: {
      footer: "self.Oasis = requireModule('oasis'); self.oasis = new self.Oasis(); self.oasis.autoInitializeSandbox();"
    }
  }
};
