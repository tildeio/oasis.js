import Oasis from "oasis";
import iframeAdapter from "oasis/iframe_adapter";
import { commonTests } from "test/helpers/suite";

var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

commonTests('Nested Sandbox', function (createSandbox, adapter) {
  // TODO: Get inception adapters working in web workers
  if (iframeAdapter === adapter) {
    test("ports sent to a sandbox can be passed to its child sandboxes", function() {
      expect(1);

      oasis.register({
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

      var sandbox = createSandbox({
        url: 'fixtures/inception_parent.js',
        services: {
          inception: InceptionService
        }
      });

      sandbox.start();
    });

    test("ports sent to a sandbox can be passed to its child sandboxes while supporting a shorthand", function() {
      expect(3);

      oasis.register({
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

      var sandbox = createSandbox({
        url: 'fixtures/inception_parent.js',
        services: {
          inception: InceptionService
        }
      });

      sandbox.start();
    });
  }
});
