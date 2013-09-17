import Oasis from "oasis";
import { commonTests } from "test/helpers/suite";

commonTests('Events', function (createSandbox) {
  test("service - card can communicate with the environment through a port with the environment shorthand for events", function() {
    expect(1);

    oasis.register({
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
    }).start();
  });

  test("service - card can communicate with the environment through a port with the card shorthand for events", function() {
    expect(2);

    oasis.register({
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

    var sandbox = createSandbox({
      url: "fixtures/assertions_shorthand.js",
      services: {
        assertions: AssertionsService
      }
    });
    
    sandbox.start();
  });

  test("When the shorthand form is used for events, they can send events", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/peter_pong.js',
      services: {
        peterpong: PeterPongService
      }
    });

    sandbox.start();
  });

  test("When the shorthand form is used for events, they can send requests", function() {
    expect(1);
    oasis.register({
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

    var sandbox = createSandbox({
      url: 'fixtures/peter_pong_request.js',
      services: {
        peterpong: PeterPongService
      }
    });

    sandbox.start();
  });

  test("sandbox event callbacks can be wrapped", function() {
    expect(2);
    stop(2);

    var sandbox = createSandbox({
      url: 'fixtures/sandbox_wrapped_event_callbacks.js',
      capabilities: ['wrappedEvents'],
      services: {
        wrappedEvents: Oasis.Service.extend({
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

    sandbox.waitForLoad().then(function (sandbox) {
      sandbox.capabilities.wrappedEvents.send('wrapMe');
    });

    sandbox.start();
  });

  test("environment event callbacks can be wrapped", function() {
    var inWrapper = false;
    expect(2);
    stop(2);

    oasis.configure('eventCallback', function (callback) {
      inWrapper = true;
      callback();
      inWrapper = false;
    });

    var sandbox = createSandbox({
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
});
