import Oasis from "oasis";
import { commonTests } from "test/helpers/suite";

commonTests('Sandbox', function (createSandbox, adapter) {
  test("assertion: must register package", function() {
    raises(function() {
      createSandbox({
        url: "fixtures/index.js"
      });
    }, Error, "Creating a sandbox from an unregistered package fails");
  });

  test("assertion: must provide capabilities when registering a package", function() {
    raises(function() {
      oasis.register({
        url: 'fixtures/index.js'
      });
    }, Error, "Registering a package without capabilities fails");
  });

  test("sandboxes have access to ports & services via `sandbox.capabilities`", function() {
    expect(2);
    stop(2);

    var sandbox = createSandbox({
      url: 'fixtures/sandbox_ports.js',
      capabilities: ['assertions', 'something', 'somethingElse'],
      services: {
        assertions: Oasis.Service.extend({
          events: {
            somethingOkay: function () {
              start();
              ok(true, "sandbox.capabilities could be used to send messages to named services");
            },
            somethingElseOkay: function () {
              start();
              ok(true, "sandbox.capabilities could be used to send messages to named services");
            }
          }
        }),
        something: Oasis.Service,
        somethingElse: Oasis.Service
      }
    });

    sandbox.waitForLoad().then(function () {
      sandbox.capabilities.something.send('go');
      sandbox.capabilities.somethingElse.send('go');
    });

    sandbox.start();
  });

  test("sandboxes have access to services via `sandbox.capabilities`", function() {
    expect(2);
    stop();

    var LocalService = Oasis.Service.extend({ }),
        channel = adapter.createChannel(oasis),
        port = channel.port2;

    var sandbox = createSandbox({
      url: 'fixtures/index.js',
      capabilities: ['serviceCapability', 'portCapability'],
      services: {
        serviceCapability: LocalService,
        portCapability: port
      }
    });

    sandbox.waitForLoad().then(function () {
      var capabilities = sandbox.capabilities;

      ok(capabilities.serviceCapability instanceof LocalService, "The capability has an associated service");
      equal(capabilities.portCapability, port, "The capability has an associated port");

      start();
    });

    sandbox.start();
  });

  test("Sandboxes should have promises that are resolved when the sandbox has finished initializing", function() {
    expect(3);

    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/index.js',
      services: {
        assertions: AssertionsService
      }
    });

    equal(serviceInitialized, false, "The service is not immediately initialized");

    stop();

    sandbox.waitForLoad().then(function() {
      start();

      ok(sandbox.assertionsPort, "The promise was not resolved until the service has been initialized");
      equal(serviceInitialized, true, "The service has been initialized once the promise is resolved");
    });

    sandbox.start();
  });

  test("Sandboxes can ask for ports directly via portFor", function() {
    expect(3);
    stop(2);

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

    var sandbox = createSandbox({
      url: 'fixtures/port_for.js',
      capabilities: ['assertions'],
      services: {
        assertions: AssertionService
      }
    });

    sandbox.start();
  });

  test("Multiple sandboxes can be created in the same environment", function() {
    expect(2);
    var sandbox1, sandbox2;

    oasis.register({
      url: "fixtures/multiple_url_1.js",
      capabilities: ['assertions']
    });

    oasis.register({
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

          sandbox1.waitForLoad().then( function() {
            sandbox1.terminate();
          });
        },

        ok2: function() {
          ok(true, "Second event was fired");

          start();
        }
      }
    });

    sandbox1 = createSandbox({
      url: 'fixtures/multiple_url_1.js',
      services: {
        assertions: AssertionsService
      }
    });

    sandbox2 = createSandbox({
      url: "fixtures/multiple_url_2.js",
      services: {
        assertions2: AssertionsService
      }
    });

    sandbox1.start();
  });

  test("Oasis' bootloader can be loaded from a default URL", function() {
    expect(2);

    oasis.configure('allowSameOrigin', true);
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
      }
    }, true);

    sandbox.start();
  });
});
