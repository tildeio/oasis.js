/*global oasis:true */

import Oasis from "oasis";

if (!this.Worker) { return; }

var webworkerAdapter = Oasis.adapters.webworker;


module('Webworker Sandboxes', {
  setup: function() {
    oasis = new Oasis();
  }
});

test("throws an error if the sandbox type is html", function() {
  expect(1);
  raises(function() {
    oasis.createSandbox({
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
