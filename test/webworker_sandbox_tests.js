import Oasis from "oasis";
import webworkerAdapter from "oasis/webworker_adapter";

module('Webworker Sandboxes', {
  setup: function() {
    Oasis.reset();
  }
});

test("throws an error if the sandbox type is html", function() {
  raises(function() {
    Oasis.createSandbox({
      url: "fixtures/html_sandbox.html",
      type: 'html',
      adapter: webworkerAdapter,
      capabilities: ['assertions'],
      services: {
        assertions: Oasis.Service
      }
    });
  }, Error, "Creating a sandbox with type: html but adapter: webworker fails.");
});

test("The workers are uniquely named to improve debugging", function() {
  Oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox1, sandbox2;

  sandbox1 = Oasis.createSandbox({
    adapter: webworkerAdapter,
    url: 'fixtures/index.js'
  });
  sandbox1.start();

  sandbox2 = Oasis.createSandbox({
    adapter: webworkerAdapter,
    url: 'fixtures/index.js'
  });
  sandbox2.start();

  ok( sandbox1.worker.name !== sandbox2.worker.name, 'The workers have a unique name');
  ok( /fixtures\/index.js/.test( sandbox1.worker.name ), 'The worker name contains the url' );
});
