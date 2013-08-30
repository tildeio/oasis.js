import Oasis from "oasis";
import { a_indexOf } from "test/helpers/shims";
import { commonTests } from "test/helpers/suite";

commonTests('Wiretapping', function (createSandbox, adapter) {
  test("Sandboxes can be wiretapped to listen to events being sent and received", function() {
    oasis.register({
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

    var sandbox = createSandbox({
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
});
