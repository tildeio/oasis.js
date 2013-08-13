import Oasis from "oasis";
import iframeAdapter from "oasis/iframe_adapter";
import webworkerAdapter from "oasis/webworker_adapter";

import { a_forEach } from "oasis/shims";

var sandboxes = [],
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function createSandboxFn(currentAdapter) {
  return function createSandbox(options) {
    if (options.adapter === undefined) { options.adapter = currentAdapter; }
    if( options.adapter === Oasis.adapters.iframe && !options.oasisURL ) {
      options.oasisURL = destinationUrl + '/oasis.js.html';
    }

    var sandbox = Oasis.createSandbox(options);
    sandboxes.push(sandbox);
    return sandbox;
  };
}

function setup() {
  Oasis.reset();
}

function teardown() {
  a_forEach.call(sandboxes, function (sandbox) {
    sandbox.terminate();
  });
  sandboxes = [];
}

export function commonTests(moduleName, testsFn) {
  module('iframe:    ' + moduleName, {
    setup: setup,
    teardown: teardown
  });
  testsFn(createSandboxFn(iframeAdapter), iframeAdapter);

  if (typeof Worker !== 'undefined') {
    module('webworker: ' + moduleName, {
      setup: setup,
      teardown: teardown
    });
    testsFn(createSandboxFn(webworkerAdapter), webworkerAdapter);
  }
}
