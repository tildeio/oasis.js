var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 2);

Oasis.connect('inception', function(port) {
  Oasis.register({
    url: 'fixtures/inception_child.js',
    capabilities: ['inception']
  });

  var sandbox = Oasis.createSandbox({
    url: "fixtures/inception_child.js",
    services: {
      inception: port
    },
    oasisURL: destinationUrl + '/oasis.js.html'
  });

  sandbox.start();
});
