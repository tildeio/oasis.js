Oasis.connect('inception', function(port) {
  Oasis.register({
    url: 'fixtures/inception_child.js',
    capabilities: ['inception']
  });

  var sandbox = Oasis.createSandbox({
    url: "fixtures/inception_child.js",
    services: {
      inception: port
    }
  });

  sandbox.start();
});
