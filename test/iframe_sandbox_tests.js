/*global oasis:true */

import Oasis from "oasis";

import { a_forEach } from "oasis/shims";
import { getBase } from "test/helpers/shims";

var sandbox, sandboxes,
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function createSandbox(options) {
  options.adapter = Oasis.adapters.iframe;
  if( !options.oasisURL ) {
    options.oasisURL = destinationUrl + '/oasis.js.html';
  }
  sandbox = oasis.createSandbox(options);
  sandboxes.push(sandbox);
  return sandbox;
}

function teardown() {
  a_forEach.call(sandboxes, function (sandbox) {
    sandbox.terminate();
  });
  sandboxes = [];
}

module('iframe Sandboxes', {
  setup: function () {
    sandboxes = [];
    oasis = new Oasis();
  },
  teardown: teardown
});

test("The iframes are uniquely named ( solve a problem with back button and improve debugging)", function() {
  expect(2);
  oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox1, sandbox2;

  sandbox1 = createSandbox({
    url: 'fixtures/index.js'
  });
  sandbox1.start();

  sandbox2 = createSandbox({
    url: 'fixtures/index.js'
  });
  sandbox2.start();

  ok( sandbox1.el.name !== sandbox2.el.name, 'The iframes have a unique name');
  ok( /fixtures\/index.js/.test( sandbox1.el.name ), 'The iframe name contains the url' );
});

test("The sandbox returns the name of the iframe", function() {
  expect(1);
  oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox = createSandbox({
    url: 'fixtures/index.js'
  });
  sandbox.start();

  equal( sandbox.name(), sandbox.el.name, 'The sandbox returns the iframe name' );
});

test("Oasis' bootloader can be hosted on a separate domain", function() {
  expect(2);

  oasis.register({
    url: "fixtures/assertions.js",
    capabilities: ['assertions']
  });

  stop();

  var AssertionsService = Oasis.Service.extend({
    initialize: function(port, capability) {
      equal(capability, 'assertions', "precond - capability is the assertions service");

      port.on('ok', function(data) {
        start();
        equal(data, 'success', "The sandbox was able to communicate back");
      });
    }
  });

  var sandbox = createSandbox({
    url: "fixtures/assertions.js",
    services: {
      assertions: AssertionsService
    },
    oasisURL: destinationUrl + '/oasis-custom-url.js.html'
  });

  sandbox.start();
});

test("returns a sandbox with an iframe element", function() {
  expect(1);
  oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox = createSandbox({
    url: "fixtures/index.js"
  });

  ok(sandbox.el instanceof window.HTMLIFrameElement, "A new iframe was returned");
});

test("A sandbox can communicate back to its originating site", function() {
  expect(1);
  stop();
  oasis.configure('allowSameOrigin', true);

  var AssertionService = Oasis.Service.extend({
    events: {
      result: function (result) {
        start();
        equal(result, "success", "Sandbox was able to request a same-origin resource");
      }
    }
  });

  var sandbox = createSandbox({
    url: destinationUrl + "/fixtures/same_origin_parent.js",
    dependencies: ['fixtures/shims.js'],
    capabilities: ['assertions'],
    services: {
      assertions: AssertionService
    },
    oasisURL: destinationUrl + "/oasis.js.html"
  });

  sandbox.start();
});

test("Sandboxes can post messages to their own nested (non-Oasis) iframes", function() {
  expect(1);
  stop();

  var sandboxUrl = destinationUrl +  "/fixtures/same_origin.js";

  oasis.register({
    url: sandboxUrl,
    capabilities: ['assertions']
  });

  var AssertionService = Oasis.Service.extend({
    events: {
      result: function (result) {
        start();
        equal(result, "success", "Sandbox was able to request a same-origin resource");
      }
    }
  });

  var sandbox = createSandbox({
    url: sandboxUrl,
    dependencies: ['fixtures/shims.js'],
    services: {
      assertions: AssertionService
    },
    oasisURL: destinationUrl + '/oasis-custom-url.js.html'
  });

  sandbox.start();
});

test("does not generate exception when not in the DOM", function() {
  expect(1);
  oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox = createSandbox({
    url: "fixtures/index.js"
  });

  window.postMessage(Oasis.adapters.iframe.sandboxInitializedMessage, '*', []);
  window.postMessage(Oasis.adapters.iframe.oasisLoadedMessage, '*', []);

  ok(true, "The iframe sandbox listener does not raise an exception");
});

test("Sandboxes ignore secondary initialization messages", function() {
  // If the second initialization message runs, two 'ok' events will be sent.
  expect(1);
  stop();

  var AssertionsService = Oasis.Service.extend({
    events: {
      ok: function (data) {
        equal(data, 'success', "Sandbox communicated.");

        sandbox.el.contentWindow.postMessage({
          isOasisInitialization: true,
          capabilities: [],
          base: getBase(),
          scriptURLs: ['fixtures/assertions.js']
        }, '*');

        start();
      }
    }
  });

  var sandbox = createSandbox({
    url: 'fixtures/assertions.js',
    capabilities: ['assertions'],
    services: {
      assertions: AssertionsService
    }
  });

  sandbox.start();
});

test("HTML Sandboxes can be loaded directly", function() {
  expect(1);
  stop();

  var sandbox = createSandbox({
    url: destinationUrl + '/fixtures/html_sandbox.html',
    type: 'html',
    capabilities: ['user', 'assertions'],
    services: {
      assertions: Oasis.Service.extend({
        events: {
          gotTitle: function (title) {
            equal(title, "High Lord of Winterfell" , "HTML Sandbox was loaded");
            start();
          }
        }
      }),
      user: Oasis.Service.extend({
        requests: {
          title: function () {
            return 'High Lord of Winterfell';
          }
        }
      })
    }
  });

  sandbox.start();
});

test("HTML Sandboxes do not verify the Oasis URL", function() {
  expect(1);
  stop();

  var sandbox = createSandbox({
    oasisURL: '/oasis.js.html',
    url: destinationUrl + '/fixtures/simple_html_sandbox.html',
    type: 'html',
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        events: {
          ok: function () {
            ok(true, "HTML sandbox loaded");
            start();
          }
        }
      })
    }
  });

  sandbox.start();
});

test("JS Sandboxes can not load resources from a different origin than the bootstrap", function() {
  expect(1);
  stop();

  var otherOrigin = location.protocol + "//" + location.hostname + ":" + (parseInt(location.port, 10) + 3);

  var sandbox = createSandbox({
    url: '/fixtures/assertions.js',
    dependencies: [otherOrigin + '/fixtures/shims.js'],
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        events: {
          ok: function () {
            ok(false, "JS sandbox should not load");
            start();
          }
        }
      })
    }
  });

  sandbox.onerror = function( error ) {
    ok( error.match("You can not load a resource"), "Loading an iframe sandbox with dependencies on an external origin fails");
    start();
  };

  sandbox.start();
});

test("`sandbox.onerror` is called when the sandbox sends an error message", function() {
  expect(1);
  stop();

  var sandbox = createSandbox({
    url: "fixtures/error.js",
    capabilities: []
  }, true);

  sandbox.onerror = function(error) {
    equal(error, "An error occured", "The error is handled");
    start();
  };

  sandbox.start();
});
