/*global oasis:true */

import Oasis from "oasis";

if (!this.Worker) { return; }

var webworkerAdapter = Oasis.adapters.webworker;


module('Webworker Sandboxes', {
  setup: function() {
    oasis = new Oasis();
  }
});

test("The workers are uniquely named to improve debugging", function() {
  expect(2);
  oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox1, sandbox2;

  sandbox1 = oasis.createSandbox({
    adapter: webworkerAdapter,
    url: 'fixtures/index.js'
  });
  sandbox1.start();

  sandbox2 = oasis.createSandbox({
    adapter: webworkerAdapter,
    url: 'fixtures/index.js'
  });
  sandbox2.start();

  ok( sandbox1.worker.name !== sandbox2.worker.name, 'The workers have a unique name');
  ok( /fixtures\/index.js/.test( sandbox1.worker.name ), 'The worker name contains the url' );
});

test("The sandbox returns the name of the worker", function() {
  expect(1);
  oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox = oasis.createSandbox({
    adapter: webworkerAdapter,
    url: 'fixtures/index.js'
  });
  sandbox.start();

  ok( sandbox.name(), sandbox.worker.name,'The sandbox returns the worker name');
});

test("`sandbox.onerror` is called when the sandbox sends an error message", function() {
  expect(1);
  stop();

  var sandbox = oasis.createSandbox({
    adapter: webworkerAdapter,
    url: "fixtures/error.worker.js",
    capabilities: []
  }, true);

  sandbox.onerror = function(error) {
    equal(error, "An error occured", "The error is handled");
    start();
  };

  sandbox.start();
});
