import Oasis from "oasis";
import { commonTests } from "test/helpers/suite";

commonTests('Services', function (createSandbox) {
  test("service is notified about ports created for a sandbox", function() {
    expect(2);

    oasis.register({
      url: "fixtures/index.js",
      capabilities: ['testData']
    });

    stop(2);

    var DataService = Oasis.Service.extend({
      initialize: function(port, capability) {
        start();
        equal(this.sandbox, sandbox, "Data service had `sandbox` set correctly.");
        equal(capability, 'testData', "Data service constructor is told what capability it fulfills.");
      }
    });

    var sandbox = createSandbox({
      url: "fixtures/index.js",
      services: {
        testData: DataService
      }
    });

    sandbox.waitForLoad().then( function() {
      start();
    });

    sandbox.start();
  });

  test("The `destroy` hook is called on each service when terminating the sandbox", function() {
    expect(1);

    oasis.register({
      url: "fixtures/index.js",
      capabilities: ['assertions']
    });

    stop();

    var AssertionsService = Oasis.Service.extend({
      destroy: function() {
        ok(true, "The destroy hook is called");
      }
    });

    var sandbox = createSandbox({
      url: "fixtures/index.js",
      services: {
        assertions: AssertionsService
      }
    });

    sandbox.start();

    sandbox.waitForLoad().then( function() {
      sandbox.terminate();
      start();
    });
  });
});
