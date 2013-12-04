import Oasis from "oasis";
import { commonTests } from "test/helpers/suite";

commonTests('Connect', function (oasis) {
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

    var sandbox = oasis.createSandbox({
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

    var sandbox = oasis.createSandbox({
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

    var sandbox = oasis.createSandbox({
      url: "fixtures/connect_failed_consumer.js",
      capabilities: ['assertions'],
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();
  });
});

