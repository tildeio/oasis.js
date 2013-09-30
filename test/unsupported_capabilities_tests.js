import Oasis from "oasis";
import { commonTests } from "test/helpers/suite";

var adapter;

commonTests('Unsupported Capabilities', function (createSandbox, adapterName) {
  test("adapters can specify unsupported capabilities", function() {
    adapter = Oasis.adapters[adapterName];
    deepEqual(adapter.unsupportedCapabilities(), [], "default list of unsupported capabilities is empty");
  });

  test("users can add unsupported capabilities to a single adapter", function() {
    expect(3);
    adapter = Oasis.adapters[adapterName];
    adapter.addUnsupportedCapability('cap');
    deepEqual(adapter.unsupportedCapabilities(), ['cap'], "users can add unsupported capabilities to an adapter");

    for (var otherAdapterName in Oasis.adapters) {
      if (!Oasis.adapters.hasOwnProperty(otherAdapterName)) { continue; }
      var otherAdapter = Oasis.adapters[otherAdapterName];
      if (adapter === otherAdapter) { continue; }

      deepEqual(otherAdapter.unsupportedCapabilities(), [], "each adapter has its own list of unsupported capabilities");
    }
  });

  test("unsupported capabilities are not connected", function() {
    expect(2);
    stop();
    adapter = Oasis.adapters[adapterName];

    var RedWire = Oasis.Service.extend(),
        BlueWire = Oasis.Service.extend({
          events: {
            checkCapabilities: function() {
              equal(this.sandbox.capabilities.blue, this, "Blue service initialized");
              equal(this.sandbox.capabilities.red, undefined, "Unsupported capabilities not initialized");
              start();
            }
          }
        });

    adapter.addUnsupportedCapability('red');

    var sandbox = createSandbox({
      url: 'fixtures/unsupported_capability_card.js',
      capabilities: ['red', 'blue'],
      services: {
        red: RedWire,
        blue: BlueWire
      }
    });
    sandbox.start();
  });
});
