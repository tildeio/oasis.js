import Oasis from "oasis";
import { errorsHaveStacks } from "test/helpers/shims";
import { commonTests } from "test/helpers/suite";

commonTests('Requests', function (createSandbox) {
  test("environment can request a value from a sandbox", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/simple_value.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("environment can request a value from a sandbox with arguments", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/simple_value_with_args.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("sandbox can request a value from the environment", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("sandbox can request a value from the environment with arguments", function() {
    expect(1);

    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/request_from_sandbox_with_args.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("environment can respond to a sandbox request with a promise that resolves", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("sandbox can respond to an environment request with a promise that resolves", function() {
    expect(1);
    oasis.register({
      url: "fixtures/promise.js",
      capabilities: ['promisepong']
    });

    stop();

    var PingPongPromiseService = Oasis.Service.extend({
      initialize: function(port, capability) {
        this.sandbox.pingPongPort = port;
      }
    });

    var sandbox = createSandbox({
      url: 'fixtures/promise.js',
      services: {
        promisepong: PingPongPromiseService
      }
    });

    sandbox.waitForLoad().then( function() {
      sandbox.pingPongPort.request('ping').then(function(data) {
        start();

        equal(data, 'pong', "promise was resolved with expected value");
      });
    });

    sandbox.start();
  });

  test("environment can respond to a sandbox request with a promise that rejects", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("sandbox can respond to an environment request with a promise that rejects", function() {
    expect(errorsHaveStacks ? 2 : 1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/rejected_request_from_environment.js',
      services: {
        pong: PingPongPromiseService
      }
    });

    sandbox.start();
  });

  test("requests whose values are undefined are treated as failures", function() {
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/request_value_is_undefined.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });
});

commonTests('EXPERIMENTAL API (Requests): ', function (createSandbox) {
  test("environment can fail a request with an exception", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/request_from_sandbox.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.start();
  });

  test("sandbox can fail a request with an exception", function() {
    expect(errorsHaveStacks ? 2 : 1);
    oasis.register({
      url: "fixtures/simple_error.js",
      capabilities: ['pong']
    });

    stop();

    var PingPongService = Oasis.Service.extend({
      initialize: function(port, capability) {
        this.sandbox.pingPongPort = port;
      }
    });

    var sandbox = createSandbox({
      url: 'fixtures/simple_error.js',
      services: {
        pong: PingPongService
      }
    });

    sandbox.waitForLoad().then( function() {
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
});
