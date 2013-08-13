import Oasis from "oasis";
import iframeAdapter from "oasis/iframe_adapter";

import { getBase } from "test/helpers/shims";

var sandbox,
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function createSandbox(options) {
  options.adapter = iframeAdapter;
  if( !options.oasisURL ) {
    options.oasisURL = destinationUrl + '/oasis.js.html';
  }
  sandbox = Oasis.createSandbox(options);
  return sandbox;
}


module('IFrame Sandboxes', {
  setup: function () {
    Oasis.reset();
  },
  teardown: function () {
    if (sandbox) { sandbox.terminate(); }
  }
});

test("The iframes are named to improve debugging", function() {
  Oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox = createSandbox({
    url: 'fixtures/index.js'
  });

  sandbox.start();

  equal( sandbox.el.name, 'fixtures/index.js', 'The iframe has a name' );
});

test("Oasis' bootloader can be hosted on a separate domain", function() {
  expect(2);

  Oasis.register({
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
  Oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  var sandbox = createSandbox({
    url: "fixtures/index.js"
  });

  ok(sandbox.el instanceof window.HTMLIFrameElement, "A new iframe was returned");
});

test("A sandbox can be loaded from the same domain with `Oasis.config.allowSameOrigin` sets to true", function() {
  Oasis.config.allowSameOrigin = true;

  var sandbox = createSandbox({
    url: "fixtures/index.js",
    capabilities: [],
    oasisURL: "/oasis.js.html"
  });

  ok(true, "Oasis can be loaded from the same domain");
});

test("Sandboxes can post messages to their own nested (non-Oasis) iframes", function() {
  stop();

  var sandboxUrl = destinationUrl +  "/fixtures/same_origin.js";

  Oasis.register({
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
  Oasis.register({
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
