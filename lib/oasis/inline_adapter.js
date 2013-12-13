/*global self, postMessage, importScripts */

import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert, extend, noop } from "oasis/util";
import { configuration } from "oasis/config";
import { a_forEach, a_map } from "oasis/shims";
import { xhr } from "oasis/xhr";

import BaseAdapter from "oasis/base_adapter";

var InlineAdapter = extend(BaseAdapter, {
  //-------------------------------------------------------------------------
  // Environment API

  initializeSandbox: function(sandbox) {
    sandbox.el = document.createElement('div');

    var oasis = sandbox.sandboxedOasis = new Oasis();
    sandbox.sandboxedOasis.sandbox = sandbox;
    // When we upgrade RSVP we can change this to `RSVP.async`
    RSVP.resolve().then(function () {
      sandbox.createAndTransferCapabilities();
    });
  },
 
  startSandbox: function(sandbox) {
    var body = document.body || document.documentElement.getElementsByTagName('body')[0];
    body.appendChild(sandbox.el);
  },

  terminateSandbox: function(sandbox) {
    var el = sandbox.el;

    if (el.parentNode) {
      Logger.log("Terminating sandbox ", sandbox.el.name);
      el.parentNode.removeChild(el);
    }

    sandbox.el = null;
  },

  connectPorts: function(sandbox, ports) {
    var rawPorts = a_map.call(ports, function(oasisPort){ return oasisPort.port; }),
        message = this.createInitializationMessage(sandbox),
        event = { data: message, ports: rawPorts };

    // Normally `connectSandbox` is called in autoinitialization, but there
    // isn't a real sandbox here.
    this.connectSandbox(sandbox.sandboxedOasis, event);
  },

  fetchResource: function (url, oasis) {
    var adapter = this;

    return xhr(url, {
      dataType: 'text'
    }, oasis).then(function (code) {
      return adapter.wrapResource(code);
    }).fail(RSVP.rethrow);
  },

  wrapResource: function (code) {
    return new Function("oasis", code);
  },

  //-------------------------------------------------------------------------
  // Sandbox API

  connectSandbox: function(oasis, pseudoEvent) {
    return this.initializeOasisSandbox(pseudoEvent, oasis);
  },

  oasisLoaded: noop,

  didConnect: function(oasis) {
    var adapter = this;

    return oasis.sandbox._waitForLoadDeferred().resolve(loadSandboxJS().fail(RSVP.rethrow));

    function applySandboxJS(sandboxFn) {
      Logger.log("sandbox: inline sandbox initialized");
      sandboxFn(oasis);
      return oasis.sandbox;
    }

    function loadSandboxJS() {
      return new RSVP.Promise(function (resolve, reject) {
        resolve(adapter.fetchResource(oasis.sandbox.options.url, oasis).
          then(applySandboxJS));
      });
    }
  },
});

export default InlineAdapter;
