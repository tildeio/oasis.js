import Oasis from "oasis";
import webworkerAdapter from "oasis/webworker_adapter";

module('Webworker Sandboxes', {
  setup: function() {
    Oasis.reset();
  }
});

test("throws an error if the sandbox type is html", function() {
  raises(function() {
    Oasis.createSandbox({
      url: "fixtures/html_sandbox.html",
      type: 'html',
      adapter: webworkerAdapter,
      capabilities: ['assertions'],
      services: {
        assertions: Oasis.Service
      }
    });
  }, Error, "Creating a sandbox with type: html but adapter: webworker fails.");
});
