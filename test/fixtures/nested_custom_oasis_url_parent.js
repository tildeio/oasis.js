oasis.configure('allowSameOrigin', true);

oasis.connect('assertions', function(port) {
  oasis.register({
    url: 'fixtures/nested_custom_oasis_url_child.js',
    capabilities: ['assertions']
  });

  var sandbox = oasis.createSandbox({
    url: 'fixtures/nested_custom_oasis_url_child.js',
    services: {
      assertions: port
    }
  });

  sandbox.start();
});
