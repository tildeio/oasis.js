(function() {

QUnit.config.testTimeout = QUnit.config.testTimeout || 5000;
// QUnit.config.testTimeout = 1000 * 60 * 2;

module("Oasis");

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

var sharedAdapter, sandbox,
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function createSandbox(options) {
  if (options.adapter === undefined) { options.adapter = Oasis.adapters[sharedAdapter]; }
  if( options.adapter === Oasis.adapters.iframe && !options.oasisURL ) {
    options.oasisURL = destinationUrl + '/oasis.js.html';
  }
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

    sandbox.promise.then( function() {
      start();
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

  test("Oasis.connect's promise rejects when connecting to a service not provided in the initiliazation message", function() {
    expect(1);
    stop();

    var AssertionsService = Oasis.Service.extend({
      events: {
        promiseRejected: function () {
          start();
          ok(true, "Oasis.connect to unprovided capability resulted in a promise rejection.");
        }
      }
    });

    createSandbox({
      url: "fixtures/connect_failed.js",
      capabilities: ['assertions'],
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("Oasis.connect invokes error callback for services not provided in the initialization message", function() {
    expect(1);
    stop();

    var AssertionsService = Oasis.Service.extend({
      events: {
        errorCallbackInvoked: function () {
          start();
          ok(true, "Oasis.connect to unprovided capability resulted in the error callback being invoked.");
        }
      }
    });

    createSandbox({
      url: "fixtures/connect_failed_callback.js",
      capabilities: ['assertions'],
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("Oasis.connect invokes `error` on consumers that could not connect", function() {
    expect(1);
    stop();

    var AssertionsService = Oasis.Service.extend({
      events: {
        consumerErrorInvoked: function () {
          start();
          ok(true, "Oasis.connect to unprovided capability resulted in consumer.error being invoked.");
        }
      }
    });

    createSandbox({
      url: "fixtures/connect_failed_consumer.js",
      capabilities: ['assertions'],
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
      url: "fixtures/simple_value.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      initialize: function(port, capability) {
        port.request('ping').then(function(data) {
          start();

          equal(data, 'pong', "promise was resolved with expected value");
        });
      }
    });

    createSandbox({
      url: 'fixtures/simple_value.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("environment can request a value from a sandbox with arguments", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/simple_value_with_args.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      initialize: function(port) {
        port.request('ping', "first", "second").then(function(data) {
          start();

          equal(data, 'pong', "promise was resolved with expected value");
        });
      }
    });

    createSandbox({
      url: 'fixtures/simple_value_with_args.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("sandbox can request a value from the environment", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/request_from_sandbox.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      requests: {
        ping: function() {
          return 'pong';
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
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("sandbox can request a value from the environment with arguments", function() {
    expect(1);

    Oasis.register({
      url: "fixtures/request_from_sandbox_with_args.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      requests: {
        ping: function(firstArg, secondArg) {
          if (firstArg === 'first' && secondArg === 'second') {
            return 'pong';
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
      url: 'fixtures/request_from_sandbox_with_args.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  // Note: experimental API
  test("environment can fail a request with an exception", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/request_from_sandbox.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      requests: {
        ping: function() {
          throw new Error('badpong');
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
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  // Note: experimental API
  test("sandbox can fail a request with an exception", function() {
    expect(errorsHaveStacks ? 2 : 1);
    Oasis.register({
      url: "fixtures/simple_error.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      initialize: function(port, capability) {
        this.sandbox.pingPongPort = port;
      }
    });

    createSandbox({
      url: 'fixtures/simple_error.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.promise.then( function() {
      sandbox.pingPongPort.request('ping').then(null, function(error) {
        equal(error.message, 'badpong', "promise was rejected with expected error");
        if (errorsHaveStacks) {
          equal(typeof error.stack, 'string', "promise was rejected with error that included stack");
        }
        start();
      });
    });

    sandbox.start();
  });

  test("environment can respond to a sandbox request with a promise that resolves", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/request_from_sandbox.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      requests: {
        ping: function() {
          return new Oasis.RSVP.Promise(function (resolve, reject) {
            setTimeout( function () {
              resolve('pong');
            }, 1);
          });
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
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("sandbox can respond to an environment request with a promise that resolves", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/promise.js",
      capabilities: ['promisepong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      initialize: function(port, capability) {
        this.sandbox.pingPongPort = port;
      }
    });

    createSandbox({
      url: 'fixtures/promise.js',
      services: {
        promisepong: PingPongPromiseService
      }
    });

    sandbox.promise.then( function() {
      sandbox.pingPongPort.request('ping').then(function(data) {
        start();

        equal(data, 'pong', "promise was resolved with expected value");
      });
    });

    sandbox.start();
  });

  test("environment can respond to a sandbox request with a promise that rejects", function() {
    expect(1);
    Oasis.register({
      url: "fixtures/request_from_sandbox.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      requests: {
        ping: function() {
          return new Oasis.RSVP.Promise(function (resolve, reject) {
            setTimeout( function () {
              try {
                throw new Error('badpong');
              } catch (error) {
                reject(error);
              }
            }, 1);
          });
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
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("sandbox can respond to an environment request with a promise that rejects", function() {
    expect(errorsHaveStacks ? 2 : 1);
    Oasis.register({
      url: "fixtures/rejected_request_from_environment.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      initialize: function(port, capability) {
        port.request('ping').then(null, function(error) {
          start();

          equal(error.message, 'badpong', "promise was rejected with expected error");

          if (errorsHaveStacks) {
            equal(typeof error.stack, 'string', "promise was rejected with error that included stack");
          }
        });
      }
    });

    createSandbox({
      url: 'fixtures/rejected_request_from_environment.js',
      services: {
        pong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("requests whose values are undefined are treated as failures", function() {
    Oasis.register({
      url: "fixtures/request_value_is_undefined.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      initialize: function(port, capability) {
        port.request('ping').then(null, function(error) {
          start();

          ok(/did not return a value/.test(error), "undefined request values are treated as errors");
        });
      }
    });

    createSandbox({
      url: 'fixtures/request_value_is_undefined.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("sandboxes have access to ports & services via `sandbox.ports`", function() {
    expect(2);
    stop(2);

    createSandbox({
      url: 'fixtures/sandbox_ports.js',
      capabilities: ['assertions', 'something', 'somethingElse'],
      services: {
        assertions: Oasis.Service.extend({
          events: {
            somethingOkay: function () {
              start();
              ok(true, "sandbox.ports could be used to send messages to named services");
            },
            somethingElseOkay: function () {
              start();
              ok(true, "sandbox.ports could be used to send messages to named services");
            }
          }
        }),
        something: Oasis.Service,
        somethingElse: Oasis.Service
      }
    });

    sandbox.promise.then(function () {
      sandbox.ports.something.send('go');
      sandbox.ports.somethingElse.send('go');
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
          port.onRequest('kick', function() {
            return 'kick1';
          });

          port.on('workPlacement', function(value) {
            start();
            equal(value, 'kick1', "messages between deeply nested sandboxes are sent");
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
          kick: function() {
            ok(this instanceof InceptionService, "The callback gets the service instance as `this`");
            return 'kick2';
          }
        },

        events: {
          workPlacement: function(value) {
            start();
            equal(value, 'kick2', "messages between deeply nested sandboxes are sent");
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

  test("Multiple sandboxes can be created in the same environment", function() {
    expect(2);
    var sandbox1, sandbox2;

    Oasis.register({
      url: "fixtures/multiple_url_1.js",
      capabilities: ['assertions']
    });

    Oasis.register({
      url: "fixtures/multiple_url_2.js",
      capabilities: ['assertions2']
    });

    stop(2);

    var AssertionsService = Oasis.Service.extend({
      events: {
        ok1: function() {
          ok(true, "First event was fired");

          start();

          sandbox2.start();

          sandbox1.promise.then( function() {
            sandbox1.terminate();
          });
        },

        ok2: function() {
          ok(true, "Second event was fired");

          start();
        }
      }
    });

    createSandbox({
      url: 'fixtures/multiple_url_1.js',
      services: {
        assertions: AssertionsService,
      }
    });
    sandbox1 = sandbox;

    createSandbox({
      url: "fixtures/multiple_url_2.js",
      services: {
        assertions2: AssertionsService
      }
    });
    sandbox2 = sandbox;

    sandbox1.start();
  });

  test("sandbox event callbacks can be wrapped", function() {
    expect(2);
    stop(2);

    createSandbox({
      url: 'fixtures/sandbox_wrapped_event_callbacks.js',
      capabilities: ['wrappedEvents'],
      services: {
        wrappedEvents: Oasis.Service.extend({
          initialize: function (port) {
            this.sandbox.port = port;
          },
          events: {
            wiretapResult: function (result) {
              start();
              ok(result, "Sandbox wiretap event handler was wrapped");
            },
            eventResult: function (result) {
              start();
              ok(result, "Sandbox event handler was wrapped");
            }
          }
        })
      }
    });

    sandbox.promise.then(function (sandbox) {
      sandbox.port.send('wrapMe');
    });

    sandbox.start();
  });

  test("environment event callbacks can be wrapped", function() {
    var inWrapper = false;
    expect(2);
    stop();
    stop();

    Oasis.configure('eventCallback', function (callback) {
      inWrapper = true;
      callback();
      inWrapper = false;
    });

    createSandbox({
      url: 'fixtures/environment_wrapped_event_callbacks.js',
      capabilities: ['wrappedEvents'],
      services: {
        wrappedEvents: Oasis.Service.extend({
          initialize: function (port) {
            port.all( function () {
              start();
              equal(inWrapper, true, "Environment wiretap event handler was wrapped");
            }, this);
          },
          events: {
            wrapMe: function () {
              start();
              equal(inWrapper, true, "Environment event handler was wrapped");
            }
          }
        })
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

    sandbox.start();
  });

  test("Sandboxes can post messages to their own nested (non-Oasis) iframes", function() {
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

    stop();

    createSandbox({
      url: sandboxUrl,
      dependencies: ['fixtures/shims.js'],
      services: {
        assertions: AssertionService
      },
      oasisURL: destinationUrl + '/vendor/oasis-custom-url.js.html'
    });

    sandbox.start();
  });

  test("does not generate exception when not in the DOM", function() {
    Oasis.register({
      url: "fixtures/index.js",
      capabilities: []
    });

    createSandbox({
      url: "fixtures/index.js"
    });

    window.postMessage(Oasis.adapters.iframe.sandboxInitializedMessage, '*', []);
    window.postMessage(Oasis.adapters.iframe.oasisLoadedMessage, '*', []);

    ok(true, "The iframe sandbox listener does not raise an exception");
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
