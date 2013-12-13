/*global oasis:true */

import Oasis from "oasis";

import { a_forEach } from "oasis/shims";
import { getBase } from "test/helpers/shims";

var sandbox, sandboxes,
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function createSandbox(options) {
  options.adapter = Oasis.adapters.iframe;
  if(!options.url.match(/^http/)) {
    options.url = destinationUrl + '/' + options.url;
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
  var sandboxUrl = destinationUrl + '/fixtures/index.html';

  oasis.register({
    url: sandboxUrl,
    capabilities: []
  });

  var sandbox1, sandbox2;

  sandbox1 = createSandbox({
    url: sandboxUrl
  });
  sandbox1.start();

  sandbox2 = createSandbox({
    url: sandboxUrl
  });
  sandbox2.start();

  ok( sandbox1.el.name !== sandbox2.el.name, 'The iframes have a unique name');
  ok( /fixtures\/index.html/.test( sandbox1.el.name ), 'The iframe name contains the url' );
});

test("The sandbox returns the name of the iframe", function() {
  expect(1);
  var sandboxUrl = destinationUrl + '/fixtures/index.html';
  oasis.register({
    url: sandboxUrl,
    capabilities: []
  });

  var sandbox = createSandbox({
    url: sandboxUrl
  });
  sandbox.start();

  equal( sandbox.name(), sandbox.el.name, 'The sandbox returns the iframe name' );
});

test("Oasis' bootloader can be hosted on a separate domain", function() {
  expect(2);
  var cardUrl = destinationUrl +  "/fixtures/assertions.html";

  oasis.register({
    url: cardUrl,
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
    url: cardUrl,
    services: {
      assertions: AssertionsService
    }
  });

  sandbox.start();
});

test("returns a sandbox with an iframe element", function() {
  expect(1);
  var sandboxUrl = destinationUrl + '/fixtures/index.html';
  oasis.register({
    url: sandboxUrl,
    capabilities: []
  });

  var sandbox = createSandbox({
    url: sandboxUrl
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
    url: destinationUrl + "/fixtures/same_origin_parent.html",
    capabilities: ['assertions'],
    services: {
      assertions: AssertionService
    }
  });

  sandbox.start();
});

test("Sandboxes can post messages to their own nested (non-Oasis) iframes", function() {
  expect(1);
  stop();

  var sandboxUrl = destinationUrl +  "/fixtures/same_origin_sandbox.html";

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
    }
  });

  sandbox.start();
});

test("does not generate exception when not in the DOM", function() {
  expect(1);
  var sandboxUrl = destinationUrl + '/fixtures/index.html';
  oasis.register({
    url: sandboxUrl,
    capabilities: []
  });

  var sandbox = createSandbox({
    url: sandboxUrl
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
    url: 'fixtures/assertions.html',
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

test("`sandbox.onerror` is called when the sandbox sends an error message", function() {
  expect(1);
  stop();

  var sandbox = createSandbox({
    url: "fixtures/error.html",
    capabilities: []
  }, true);

  sandbox.onerror = function(error) {
    equal(error, "An error occured", "The error is handled");
    start();
  };

  sandbox.start();
});

test("A sandbox can be reconnected after navigation", function() {
  expect(2);
  stop(2);

  var sandbox = createSandbox({
    url: "fixtures/reconnect.html",
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        requests: {
          firstLoad: function () {
            start();
            ok(true, "Sandbox loaded initially");

            return true;
          },
        },
        events: {
          secondLoad: function (result) {
            start();
            ok(true, "Sandbox reconnected after navigation");
          }
        }
      })
    }
  });

  sandbox.start();
});

test("when a sandbox is reconnected, services are torn down and recreated", function() {
  expect(4);
  stop(2);

  var sandbox = createSandbox({
    url: "fixtures/reconnect.html",
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        init: function () {
          // fires twice: once for initial connection and again on reconnection
          ok("Service initialized");
        },
        requests: {
          firstLoad: function () {
            start();
            ok(true, "Sandbox loaded initially");

            return true;
          },
        },
        events: {
          secondLoad: function (result) {
            start();
            ok(true, "Sandbox reconnected after navigation");
          }
        }
      })
    }
  });

  sandbox.start();
});
