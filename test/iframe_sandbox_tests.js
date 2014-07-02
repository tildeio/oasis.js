/*global oasis:true */

import Oasis from "oasis";

import { a_forEach } from "oasis/shims";
import { getBase, _addEventListener } from "test/helpers/shims";
import { isSandboxAttributeSupported } from "test/helpers/suite";

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

test("Sandboxes can open popup windows when allowed", function() {
  expect(1);
  stop();

  var sandboxUrl = destinationUrl + '/fixtures/popup_parent.html';
  oasis.register({
    url: sandboxUrl,
    capabilities: ['assertions']
  });

  var AssertionsService = Oasis.Service.extend({
    events: {
      ok: function(data) {
        start();
        equal(data, true,  "The sandboxed iframe can open a popup window");
      }
    }
  });

  var sandbox = createSandbox({
    url: sandboxUrl,
    services: {
      assertions: AssertionsService
    },
    sandbox: {
      popups: true
    }
  });

  sandbox.start();
});

if( isSandboxAttributeSupported() ) {
  test("Sandboxes can not open popup windows when not allowed", function() {
    expect(1);
    stop();

    var sandboxUrl = destinationUrl + '/fixtures/popup_parent.html';
    oasis.register({
      url: sandboxUrl,
      capabilities: ['assertions']
    });

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok: function(data) {
          start();
          equal(data, false,  "The sandboxed iframe can not open a popup window");
        }
      }
    });

    var sandbox = createSandbox({
      url: sandboxUrl,
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });
}

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

test("when a sandbox is reconnected, services are torn down and recreated", function() {
  expect(4);
  stop(2);

  oasis.configure('allowSameOrigin', true);
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

test("with `reconnect:'none'` sandboxes do not reconnect", function() {
  expect(3);
  stop();

  oasis.configure('reconnect', 'none');
  var sandbox = createSandbox({
    url: "fixtures/reconnect.html",
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        requests: {
          firstLoad: function () {
            ok(true, "sandbox is navigating and will reconnect");
            return true;
          }
        }
      })
    }
  });

  sandbox.start();

  sandbox.waitForLoad().then(function (sandbox) {
    ok(true, "sandbox loaded first time");

    sandbox.createAndTransferCapabilities = function () {
      start();
      ok(false, "sandbox did not accept reconnection with reconnect: none");
    };

    _addEventListener(window, 'message', oasisLoadMessageReceived);

    function oasisLoadMessageReceived(event) {
      if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
      try {
        if( !sandbox.el || event.source !== sandbox.el.contentWindow ) {return;}
      } catch(e) {
        return;
      }

      setTimeout (function () {
        ok(true, "Second load event received: should not have called `createAndTransferCapabilities` again");
        start();
      }, 1);
    }
  });
});

test("with `reconnect: any` sandboxes will reconnect with other origins", function() {
  expect(4);
  stop(2);

  oasis.configure('allowSameOrigin', false);
  oasis.configure('reconnect', 'any');
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

test("with `reconnect: verify` sandboxes will not reconnect with different origins", function() {
  expect(3);
  stop();

  oasis.configure('reconnect', 'verify');
  var sandbox = createSandbox({
    url: "fixtures/reconnect_different_origin.html",
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        requests: {
          firstLoad: function () {
            ok(true, "sandbox is navigating and will reconnect");
            return true;
          }
        }
      })
    }
  });

  sandbox.start();

  sandbox.waitForLoad().then(function (sandbox) {
    ok(true, "sandbox loaded first time");

    sandbox.createAndTransferCapabilities = function () {
      start();
      ok(false, "sandbox did not accept reconnection from a different origin with reconnect: verify");
    };

    sandbox.onerror = function (error) {
      start();
      ok(/Cannot reconnect/i.test(error.message), "reconnect: verify prevented reconnection from different origin");
    };
  });
});

test("with `reconnect: verify` sandboxes will not reconnect if allowSameOrigin is false", function() {
  expect(3);
  stop();

  oasis.configure('allowSameOrigin', false);
  oasis.configure('reconnect', 'verify');
  var sandbox = createSandbox({
    url: "fixtures/reconnect.html",
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service.extend({
        requests: {
          firstLoad: function () {
            ok(true, "sandbox is navigating and will reconnect");
            return true;
          }
        }
      })
    }
  });

  sandbox.start();

  sandbox.waitForLoad().then(function (sandbox) {
    ok(true, "sandbox loaded first time");

    sandbox.createAndTransferCapabilities = function () {
      start();
      ok(false, "sandbox did not accept reconnection with reconnect: verify and allowSameOrigin: false");
    };

    sandbox.onerror = function (error) {
      start();
      ok(/Cannot reconnect/i.test(error.message), "reconnect: verify prevented reconnection from null origin");
    };
  });
});

test("with `reconnect: verify` sandboxes will reconnect with origins that match the sandbox's original url", function() {
  expect(2);
  stop(2);

  oasis.configure('allowSameOrigin', true);
  oasis.configure('reconnect', 'verify');
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

test("`reconnect` can be overridden at `createSandbox`", function() {
  expect(1);

  oasis.configure('reconnect', 'none');
  var sandbox = createSandbox({
    url: "fixtures/reconnect.html",
    capabilities: ['dummy'],
    reconnect: 'verify'
  });

  equal(sandbox.options.reconnect, "verify", "reconnect option can be specified per-sandbox");
});

test("`reconnect` defaults to 'verify'", function() {
  equal(new Oasis().configuration.reconnect, "verify", "`reconnect` defaults to 'verify'");
});
