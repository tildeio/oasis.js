(function() {

QUnit.config.testTimeout = QUnit.config.testTimeout || 5000;
// QUnit.config.testTimeout = 1000 * 60 * 2;

module("Oasis");

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

var sharedAdapter, sandbox;

function createSandbox(options) {
  if (options.adapter === undefined) { options.adapter = Oasis.adapters[sharedAdapter]; }
  sandbox = Oasis.createSandbox(options);

  stop();
  sandbox.promise.then(function () {
    start();
  });
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

  test("service - the `destroy` hook is called on each service when terminating the sandbox", function() {
    expect(1);

    Oasis.register({
      url: "fixtures/index.js",
      capabilities: ['assertions']
    });

    stop();

    var AssertionsService = Oasis.Service.extend({
      destroy: function() {
        ok(true, "The destroy hook is called");
      }
    });

    createSandbox({
      url: "fixtures/index.js",
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();

    sandbox.promise.then( function() {
      sandbox.terminate();
      start();
    });
  });

  test("service - when closing a port, no messages are received", function() {
    expect(1);

    var testPort;

    Oasis.register({
      url: "fixtures/close_service.js",
      capabilities: ['close']
    });

    stop();

    var CloseService = Oasis.Service.extend({
      events: {
        sandboxInitialized: function(data) {
          ok(true, "sandbox initialized");

          this.send('ping');
          this.port.close();

          // We try to test the lack of message
          setTimeout( function() {
            start();
          }, 200);
        },

        pong: function() {
          ok(false, "Succesfully sent events from event shorthand function");
        }
      }
    });

    createSandbox({
      url: "fixtures/close_service.js",
      services: {
        close: CloseService
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

    test("The iframes are named to improve debugging", function() {
      Oasis.register({
        url: "fixtures/index.js",
        capabilities: []
      });

      createSandbox({
        url: 'fixtures/index.js'
      });

      sandbox.start();

      equal( sandbox.el.name, 'fixtures/index.js', 'The iframe has a name' );
    });

    test("Nested sandboxes should default `oasisURL` to the one they were given", function() {
      expect(1);

      var AssertionService = Oasis.Service.extend({
        events: {
          checkUrl: function (oasisURL) {
            var expected = "oasis-custom-url.js.html";
            start();
            equal(oasisURL.substring(oasisURL.length - expected.length), expected, "Nested sandboxed used right oasisURL");
          }
        }
      });

      createSandbox({
        url: 'fixtures/nested_custom_oasis_url_parent.js',
        capabilities: ['assertions'],
        services: {
          assertions: AssertionService
        },
        oasisURL: '/vendor/oasis-custom-url.js.html'
      });

      stop();

      sandbox.start();
    });

    test("Oasis' bootloader can be hosted on a separate domain", function() {
      expect(2);
      var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

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
        },
        oasisURL: destinationUrl + '/vendor/oasis-custom-url.js.html'
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
      url: 'fixtures/index.js',
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
      url: 'fixtures/index.js',
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
      start();

      var loc = a_indexOf.call(expectedEvents, event.type);
      if (loc > -1) {
        ok(true, "received expected message " + event.type);
        expectedEvents.splice(loc, 1);
      }
    });

    sandbox.start();
  });

  test("Sandboxes can ask for ports directly via portFor", function() {
    expect(3);

    var AssertionService = Oasis.Service.extend({
      events: {
        blackRaven: function (message) {
          equal(message, "dark words", "Card connected to port and sent a message.");
        },

        whiteRaven: function (message) {
          start();
          equal(message, "winter is coming", "Card retrieved port via `portFor`.");
        },

        redRaven: function (message) {
          start();
          equal(message, "no such port", "`portFor` throws an exception when asked to retrieve a port for an unsupplied capability");
        }
      }
    });

    createSandbox({
      url: 'fixtures/port_for.js',
      capabilities: ['assertions'],
      services: {
        assertions: AssertionService
      }
    });

    stop();
    stop();

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

    sandbox.start();
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
      dependencies: ['fixtures/shims.js'],
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
