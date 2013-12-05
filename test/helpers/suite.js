import IframeAdapter from "oasis/iframe_adapter";
import WebworkerAdapter from "oasis/webworker_adapter";
import InlineAdapter from "oasis/inline_adapter";
import { a_forEach, o_create } from "oasis/shims";
import { _addEventListener } from "test/helpers/shims";

var sandboxes = [],
    destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

function iframeOptions(options) {
  if (options.adapter === undefined) { options.adapter = Oasis.adapters.iframe; }
  options.url = options.url.replace(/\.js/, '.html');

  if(!options.url.match(/^http/)) {
    options.url = destinationUrl + '/' + options.url;
  }
}

function webworkerOptions(options) {
  if (options.adapter === undefined) { options.adapter = Oasis.adapters.webworker; }
  options.url = options.url.replace(/\.js/, '.worker.js');
}

function inlineOptions(options) {
  if (options.adapter === undefined) { options.adapter = Oasis.adapters.inline; }
}

function createSandbox(options) {
  var sandbox = window.oasis.createSandbox(options);
  sandboxes.push(sandbox);
  return sandbox;
}

function createIframeSandbox(options) {
  iframeOptions(options);
  return createSandbox(options);
}

function createWebworkerSandbox(options) {
  webworkerOptions(options);
  var sandbox = createSandbox(options);

  if (sandbox.worker) {
    _addEventListener(sandbox.worker, 'error', function (error) {
      console.error(error.message, error.filename, error.lineno, error);
    });
  }

  return sandbox;
}

function createInlineSandbox(options) {
  inlineOptions(options);
  return createSandbox(options);
}

function registerIframe(options) {
  iframeOptions(options);
  window.oasis.register(options);
}

function registerWebworker(options) {
  webworkerOptions(options);
  window.oasis.register(options);
}

function registerInline(options) {
  inlineOptions(options);
  window.oasis.register(options);
}

function configure() {
  return window.oasis.configure.apply(window.oasis, arguments);
}

function iframeOasis() {
  return {
    configure: configure,
    register: registerIframe,
    createSandbox: createIframeSandbox,
  };
}

function webworkerOasis() {
  return {
    configure: configure,
    register: registerWebworker,
    createSandbox: createWebworkerSandbox
  };
}

function inlineOasis() {
  return {
    configure: configure,
    register: registerInline,
    createSandbox: createInlineSandbox
  };
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

  Oasis.reset();
}

export function commonTests(moduleName, testsFn) {
  module('iframe:    ' + moduleName, {
    setup: setup,
    teardown: teardown
  });
  testsFn(iframeOasis(), 'iframe');

  if (typeof Worker !== 'undefined') {
    module('webworker: ' + moduleName, {
      setup: setup,
      teardown: teardown
    });
    testsFn(webworkerOasis(), 'webworker');
  }

  module('inline:    ' + moduleName, {
    setup: setup,
    teardown: teardown
  });
  testsFn(inlineOasis(), 'inline');
}

export function isSandboxAttributeSupported() {
  if( typeof Window === "undefined" ) return false;

  var iframe = document.createElement('iframe');

  return iframe.sandbox !== undefined;
}
