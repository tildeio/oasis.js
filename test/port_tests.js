import Oasis from "oasis";
import { commonTests } from "test/helpers/suite";

commonTests('Ports', function (oasis) {
  test("sandbox can communicate with the environment through a port", function() {
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
          equal(data, 'success', "The card was able to communicate back");
        });
      }
    });

    var sandbox = oasis.createSandbox({
      url: "fixtures/assertions.js",
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });

  test("shorthand - sandbox can communicate with the environment through a port", function() {
    expect(1);
    stop();

    var sandbox = oasis.createSandbox({
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

  test("when closing a port, no messages are received", function() {
    expect(1);

    var testPort;

    oasis.register({
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

    var sandbox = oasis.createSandbox({
      url: "fixtures/close_service.js",
      services: {
        close: CloseService
      }
    });

    sandbox.start();
  });

  test("environment can communicate with the sandbox through a port", function() {
    expect(2);

    oasis.register({
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

    var sandbox = oasis.createSandbox({
      url: 'fixtures/to_environment.js',
      services: {
        pingpong: PingPongService
      }
    });

    sandbox.start();
  });

  test("environment can communicate with the sandbox through a port with a shorthand", function() {
    expect(1);

    oasis.register({
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

    var sandbox = oasis.createSandbox({
      url: 'fixtures/to_environment.js',
      services: {
        pingpong: PingPongService
      }
    });

    sandbox.start();
  });
});
