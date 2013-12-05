var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 2),
    childCardUrl = destinationUrl +  '/fixtures/inception_child.js';

oasis.connect('inception', function(port) {
  oasis.register({
    url: childCardUrl,
    capabilities: ['inception']
  });

  var sandbox = oasis.createSandbox({
    url: childCardUrl,
    services: {
      inception: port
    }
  });

  sandbox.start();
});
