import iframeAdapter from "oasis/iframe_adapter";
import webworkerAdapter from "oasis/webworker_adapter";
import inlineAdapter from "oasis/inline_adapter";

import { a_forEach } from "oasis/shims";
import { _addEventListener } from "test/helpers/shims";

var sandboxes = [],
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function createSandbox(options) {
  var sandbox = window.oasis.createSandbox(options);
  sandboxes.push(sandbox);
  return sandbox;
}

function createIframeSandbox(options, skipOasisURL) {
  if (options.adapter === undefined) { options.adapter = iframeAdapter; }
  if (!options.oasisURL && !skipOasisURL) {
    options.oasisURL = destinationUrl + '/oasis.js.html';
  }

  return createSandbox(options, skipOasisURL);
}

function createWebworkerSandbox(options) {
  if (options.adapter === undefined) { options.adapter = webworkerAdapter; }
  var sandbox = createSandbox(options);

  if (sandbox.worker) {
    _addEventListener(sandbox.worker, 'error', function (error) {
      console.error(error.message, error.filename, error.lineno, error);
    });
  }

  return sandbox;
}

function createInlineSandbox(options) {
  if (options.adapter === undefined) { options.adapter = inlineAdapter; }
  return createSandbox(options);
}

function setup() {
  window.oasis = new Oasis();
  window.oasis.logger.enable();
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
  testsFn(createIframeSandbox, iframeAdapter);

  if (typeof Worker !== 'undefined') {
    module('webworker: ' + moduleName, {
      setup: setup,
      teardown: teardown
    });
    testsFn(createWebworkerSandbox, webworkerAdapter);
  }

  module('inline:    ' + moduleName, {
    setup: setup,
    teardown: teardown
  });
  testsFn(createInlineSandbox, inlineAdapter);
}
