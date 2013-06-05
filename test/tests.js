(function() {

QUnit.config.testTimeout = 500;
//QUnit.config.testTimeout = 500 * 100;

module("Oasis");

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

test("Assert browser satisfies minimum requirements", function() {
  var iframe = document.createElement('iframe');

  iframe.sandbox = 'allow-scripts';
  ok(iframe.getAttribute('sandbox') === 'allow-scripts', "The current version of Oasis requires Sandboxed iframes, which are not supported on your current platform. See http://caniuse.com/#feat=iframe-sandbox");

  ok(typeof MessageChannel !== 'undefined', "The current version of Oasis requires MessageChannel, which is not supported on your current platform. A near-future version of Oasis will polyfill MessageChannel using the postMessage API");
});

var sharedAdapter, sandbox;

function createSandbox(options) {
  if (options.adapter === undefined) { options.adapter = Oasis.adapters[sharedAdapter]; }
  sandbox = Oasis.createSandbox(options);
}

function suite(adapter, extras) {
  module("Oasis.createSandbox (for the " + adapter + " adapter)", {
    setup: function() {
      sharedAdapter = adapter;
    },

    teardown: function() {
      if (sandbox) { sandbox.terminate(); sandbox = undefined; }
      Oasis.reset();
    }
  });

  if (extras) {
    extras.call({ createSandbox: createSandbox });
  }

  test("assertion: must register package", function() {
    raises(function() {
      createSandbox({
        url: "fixtures/index.js"
      });
    }, Error, "Creating a card from an unregistered package fails");
  });

  test("assertion: must provide capabilities when registering a package", function() {
    raises(function() {
      Oasis.register({
        url: 'fixtures/index.js'
      });
    }, Error, "Registering a package without capabilities fails");
  });

  test("service is notified about ports created for a card", function() {
    expect(2);

    Oasis.register({
      url: "fixtures/index.js",
      capabilities: ['testData']
    });

    stop();

    var DataService = Oasis.Service.extend({
      initialize: function(port, capability) {
        start();
        equal(this.sandbox, sandbox);
        equal(capability, 'testData');
      }
    });

    createSandbox({
      url: "fixtures/index.js",
      services: {
        testData: DataService
      }
    });

    sandbox.start();
  });

  test("service - card can communicate with the environment through a port", function() {
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
          equal(data, 'success', "The card was able to communicate back");
        });
      }
    });

    createSandbox({
      url: "fixtures/assertions.js",
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("service - card can communicate with the environment through a port with the environment shorthand for events", function() {
    expect(1);

    Oasis.register({
      url: "fixtures/assertions.js",
      capabilities: ['assertions']
    });

    stop();

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok: function(data) {
          start();
          equal(data, 'success', "The card was able to communicate back");
        }
      }
    });

    createSandbox({
      url: "fixtures/assertions.js",
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("service - card can communicate with the environment through a port with the card shorthand for events", function() {
    expect(2);

    Oasis.register({
      url: "fixtures/assertions_shorthand.js",
      capabilities: ['assertions']
    });

    stop();

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok: function(data) {
          equal(data, 'success', "The card was able to communicate back");

          this.send('ping');
        },

        pong: function() {
          this.request('ping').then(function(response) {
            start();
            equal(response, "pong");
          });
        }
      }
    });

    createSandbox({
      url: "fixtures/assertions_shorthand.js",
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("shorthand - card can communicate with the environment through a port", function() {
    expect(1);
    stop();

    createSandbox({
      url: "fixtures/assertions.js",
      capabilities: ['assertions']
    });

    sandbox.connect('assertions').then(function(port) {
      port.on('ok', function(data) {
        start();
        equal(data, 'success', "The card was able to communicate back");
      });
    });

    sandbox.start();
  });

  test("environment can communicate with the card through a port", function() {
    expect(2);

    Oasis.register({
      url: "fixtures/to_environment.js",
      capabilities: ['pingpong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      initialize: function(port, capability) {
        equal(capability, 'pingpong', "precond - capability is the pingpong service");

        port.on('pong', function(data) {
          start();
          equal(data, "PONG", "Got pong from the child");
        });

        port.send('ping', "PONG");
      }
    });

    createSandbox({
      url: 'fixtures/to_environment.js',
      services: {
        pingpong: PingPongService
      }
    });

    sandbox.start();
  });

  test("environment can communicate with the card through a port with a shorthand", function() {
    expect(1);

    Oasis.register({
      url: "fixtures/to_environment.js",
      capabilities: ['pingpong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      events: {
        pong: function(data) {
          start();
          equal(data, "PONG", "Got pong from the child");
        }
      },

      initialize: function(port) {
        port.send('ping', "PONG");
      }
    });

    createSandbox({
      url: 'fixtures/to_environment.js',
      services: {
        pingpong: PingPongService
      }
    });

    sandbox.start();
  });

  test("environment can request a value from a sandbox", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/promise.js",
      capabilities: ['promisepong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      initialize: function(port, capability) {
        port.request('ping').then(function(data) {
          start();

          equal(data, 'pong', "promise was resolved with expected value");
        });
      }
    });

    createSandbox({
      url: 'fixtures/promise.js',
      services: {
        promisepong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("environment can request a value from a sandbox with arguments", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/promise_with_args.js",
      capabilities: ['promisepong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      initialize: function(port, capability) {
        port.request('ping', "first", "second").then(function(data) {
          start();

          equal(data, 'pong', "promise was resolved with expected value");
        });
      }
    });

    createSandbox({
      url: 'fixtures/promise_with_args.js',
      services: {
        promisepong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("sandbox can request a value from the environment", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/promise_request_from_environment.js",
      capabilities: ['promisepong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      requests: {
        ping: function(promise) {
          promise.resolve('pong');
        }
      },

      events: {
        testResolvedToSatisfaction: function() {
          start();
          ok(true, "test was resolved to sandbox's satisfaction");
        }
      }
    });

    createSandbox({
      url: 'fixtures/promise_request_from_environment.js',
      services: {
        promisepong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("sandbox can request a value from the environment with arguments", function() {
    expect(1);

    Oasis.register({
      url: "fixtures/promise_request_from_environment_with_args.js",
      capabilities: ['promisepong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      requests: {
        ping: function(promise, firstArg, secondArg) {
          if (firstArg === 'first' && secondArg === 'second') {
            promise.resolve('pong');
          } else {
            promise.reject("Did not receive expected arguments.");
          }
        }
      },

      events: {
        testResolvedToSatisfaction: function() {
          start();
          ok(true, "test was resolved to sandbox's satisfaction");
        }
      }
    });

    createSandbox({
      url: 'fixtures/promise_request_from_environment_with_args.js',
      services: {
        promisepong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  // TODO: Get inception adapters working in web workers
  if (adapter === 'iframe') {
    test("ports sent to a sandbox can be passed to its child sandboxes", function() {
      expect(1);

      Oasis.register({
        url: "fixtures/inception_parent.js",
        capabilities: ['inception']
      });

      stop();

      var InceptionService = Oasis.Service.extend({
        initialize: function(port) {
          port.onRequest('kick', function(promise) {
            promise.resolve('kick');
          });

          port.on('workPlacement', function() {
            start();
            ok(true, "messages between deeply nested sandboxes are sent");
          });
        }
      });

      createSandbox({
        url: 'fixtures/inception_parent.js',
        services: {
          inception: InceptionService
        }
      });

      sandbox.start();
    });

    test("ports sent to a sandbox can be passed to its child sandboxes while supporting a shorthand", function() {
      expect(3);

      Oasis.register({
        url: "fixtures/inception_parent.js",
        capabilities: ['inception']
      });

      stop();

      var InceptionService = Oasis.Service.extend({
        requests: {
          kick: function(promise) {
            promise.resolve('kick');
            ok(this instanceof InceptionService, "The callback gets the service instance as `this`");
          }
        },

        events: {
          workPlacement: function() {
            start();
            ok(true, "messages between deeply nested sandboxes are sent");
            ok(this instanceof InceptionService, "The callback gets the service instance as `this`");
          }
        }
      });

      createSandbox({
        url: 'fixtures/inception_parent.js',
        services: {
          inception: InceptionService
        }
      });

      sandbox.start();
    });
  }

  test("When the shorthand form is used for events, they can send events", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/peter_pong.js",
      capabilities: ['peterpong']
    });

    stop();

    var PeterPongService = Oasis.Service.extend({
      events: {
        peter: function() {
          this.send('ping');
        },

        pong: function() {
          start();

          ok(true, "Succesfully sent events from event shorthand function");
        }
      }
    });

    createSandbox({
      url: 'fixtures/peter_pong.js',
      services: {
        peterpong: PeterPongService
      }
    });

    sandbox.start();
  });

  test("When the shorthand form is used for events, they can send requests", function() {
    Oasis.register({
      url: "fixtures/peter_pong_request.js",
      capabilities: ['peterpong']
    });

    stop();

    var PeterPongService = Oasis.Service.extend({
      events: {
        peter: function() {
          this.request('ping').then(function(data) {
            start();
            ok(true, "Successfully sent request from event shorthand function");
          });
        }
      }
    });

    createSandbox({
      url: 'fixtures/peter_pong_request.js',
      services: {
        peterpong: PeterPongService
      }
    });

    sandbox.start();
  });

  test("Consumers instances are saved on the Oasis global", function() {
    stop();

    Oasis.register({
      url: "fixtures/consumer.js",
      capabilities: ['assertions']
    });

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok: function() {
          start();
          ok(true, "Consumer was accessed");
        }
      }
    });

    createSandbox({
      url: 'fixtures/consumer.js',
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("Sandboxes can have multiple URLs whose sources are loaded synchronously", function() {
    Oasis.register({
      url: 'fixtures/multiple_url_1.js',
      dependencies: ['fixtures/multiple_url_2.js'],
      capabilities: ['assertions', 'assertions2']
    });

    stop();
    stop();

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok1: function() {
          start();
          ok(true, "First event was fired");
        },

        ok2: function() {
          start();
          ok(true, "Second event was fired");
        }
      }
    });

    createSandbox({
      url: 'fixtures/multiple_url_1.js',
      services: {
        assertions: AssertionsService,
        assertions2: AssertionsService
      }
    });

    sandbox.start();
  });

  test("Consumers do not process events until connect() has been called", function() {
    Oasis.register({
      url: 'fixtures/delayed_connect.js',
      capabilities: ['assertions']
    });

    stop();

    var AssertionsService = Oasis.Service.extend({
      initialize: function(port) {
        port.send('ping');
      },

      events: {
        pong: function() {
          start();
          ok(true, "The child card acknowledged the ping");
        }
      }
    });

    createSandbox({
      url: 'fixtures/delayed_connect.js',
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  // This isn't a great API, but rsvp does not officially support promise
  // entities.
  test("Sandboxes should have promises that are resolved when the sandbox has finished initializing", function() {
    expect(3);

    Oasis.register({
      url: 'fixtures/sandbox_as_promise.js',
      capabilities: ['assertions']
    });

    var serviceInitialized = false;

    var AssertionsService = Oasis.Service.extend({
      initialize: function(port) {
        this.sandbox.assertionsPort = port;
        serviceInitialized = true;
      }
    });

    createSandbox({
      url: 'fixtures/sandbox_as_promise.js',
      services: {
        assertions: AssertionsService
      }
    });

    equal(serviceInitialized, false, "The service is not immediately initialized");

    stop();

    sandbox.promise.then(function() {
      start();

      ok(sandbox.assertionsPort, "The promise was not resolved until the service has been initialized");
      equal(serviceInitialized, true, "The service has been initialized once the promise is resolved");
    });

    sandbox.start();
  });

  test("Sandboxes can be wiretapped to listen to events being sent and received", function() {
    Oasis.register({
      url: 'fixtures/wiretapping.js',
      capabilities: ['assertions', 'otherStuff']
    });

    var AssertionsService = Oasis.Service.extend({
      initialize: function(port) {
        port.send('sentAssertion');
      }
    });

    var OtherStuffService = Oasis.Service.extend({
      initialize: function(port) {
        port.send('sentOther');
      }
    });

    createSandbox({
      url: 'fixtures/wiretapping.js',
      services: {
        assertions: AssertionsService,
        otherStuff: OtherStuffService
      }
    });

    stop();
    stop();
    stop();
    stop();

    var expectedEvents = ['sentAssertion', 'sentOther', 'receivedAssertion', 'receivedOther'];

    sandbox.wiretap(function(service, event) {
      console.log(service, event);
      start();

      var loc = expectedEvents.indexOf(event.type);
      if (loc > -1) {
        ok(true, "received expected message " + event.type);
        expectedEvents.splice(loc, 1);
      }
    });

    sandbox.start();
  });
}

suite('iframe', function() {
  test("returns a sandbox with an iframe element", function() {
    Oasis.register({
      url: "fixtures/index.js",
      capabilities: []
    });

    createSandbox({
      url: "fixtures/index.js"
    });

    ok(sandbox.el instanceof window.HTMLIFrameElement, "A new iframe was returned");
  });

  test("Sandboxes can post messages to their own nested (non-Oasis) iframes", function() {
    Oasis.register({
      url: "fixtures/same_origin.js",
      capabilities: ['origin', 'assertions']
    });

    var OriginService = Oasis.Service.extend({
      requests: {
        origin: function (promise) {
          ok(true, "Sandbox requested origin.");
          promise.resolve(location.protocol + '//' + location.host);
        }
      }
    });
    var AssertionService = Oasis.Service.extend({
      events: {
        result: function (result) {
          start();
          equal(result, "success", "Sandbox was able to request a same-origin resource");
        }
      }
    });

    stop();

    createSandbox({
      url: "fixtures/same_origin.js",
      services: {
        origin: OriginService,
        assertions: AssertionService
      }
    });

    sandbox.start();
  });

  test("Sandboxes ignore secondary initialization messages", function() {
    // If the second initialization message runs, two 'ok' events will be sent.
    expect(1);

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok: function (data) {
          start();
          equal(data, 'success', "Sandbox communicated.");

          sandbox.el.contentWindow.postMessage({
            isOasisInitialization: true,
            capabilities: [],
            base: getBase(),
            scriptURLs: ['fixtures/assertions.js']
          }, '*');
        }
      }
    });

    createSandbox({
      url: 'fixtures/assertions.js',
      capabilities: ['assertions'],
      services: {
        assertions: AssertionsService
      }
    });

    stop();
    sandbox.start();
  });
});

if (typeof Worker !== 'undefined') {
  suite('webworker');
}

})();
