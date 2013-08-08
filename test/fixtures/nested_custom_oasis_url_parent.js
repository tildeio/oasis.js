Oasis.config.allowSameOrigin = true;

Oasis.connect('assertions', function(port) {
  Oasis.register({
    url: 'fixtures/nested_custom_oasis_url_child.js',
    capabilities: ['assertions']
  });

  var sandbox = Oasis.createSandbox({
    url: 'fixtures/nested_custom_oasis_url_child.js',
    services: {
      assertions: port
    }
  });

  sandbox.start();
});
