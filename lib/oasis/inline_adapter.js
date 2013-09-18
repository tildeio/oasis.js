/*global self, postMessage, importScripts */

import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert, extend, noop } from "oasis/util";
import { configuration } from "oasis/config";
import { a_forEach, a_map } from "oasis/shims";
import { xhr } from "oasis/xhr";

import {  PostMessageMessageChannel } from 'oasis/message_channel';
import BaseAdapter from "oasis/base_adapter";


function fetchResource(url, oasis) {
  return xhr(url, {
    dataType: 'text'
  }, oasis).then(function (data) {
    return new Function("oasis", data);
  }).fail(RSVP.rethrow);
}

var InlineAdapter = extend(BaseAdapter, {
  //-------------------------------------------------------------------------
  // Environment API

  initializeSandbox: function(sandbox) {
    assert(sandbox.type !== 'html', "Inline adapter only supports type `js` sandboxes, but type `html` was requested.");

    sandbox.el = document.createElement('div');

    var oasis = sandbox.sandboxedOasis = new Oasis();
    sandbox.sandboxedOasis.sandbox = sandbox;

    return RSVP.resolve();
  },
 
  startSandbox: function(sandbox) { },

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

    this.initializeOasisSandbox(event, sandbox.sandboxedOasis);
  },

  generateScriptURLs: function (sandbox) {
    // We will manually load the sandbox URL
    return sandbox.dependencies || [];
  },

  //-------------------------------------------------------------------------
  // Sandbox API

  connectSandbox: function(oasis) {
    var pseudoEvent = null;
    return BaseAdapter.prototype.initializeOasisSandbox.call(this, pseudoEvent);
  },

  oasisLoaded: noop,

  didConnect: function(oasis) {
    // This means the sandbox promise is not resolved until dependencies are
    // loaded, which is not necessarily the case for the other adapters
    oasis._loadScripts.then(function () {
      oasis.sandbox._waitForLoadDeferred().resolve(oasis.sandbox);
    });
  },

  loadScripts: function (base, scriptURLs, oasis) {
    oasis._loadScripts = RSVP.all(a_map.call(scriptURLs, function (url) {
      return fetchResource(url, oasis);
    })).then(function (dependencies) {
      a_forEach.call(dependencies, function (dependency) {
        dependency(oasis);
      });
    }).then(loadSandboxJS).fail(RSVP.rethrow);

    function applySandboxJS(sandboxFn) {
      Logger.log("inline sandbox initialized");
      sandboxFn(oasis);
      return oasis.sandbox;
    }

    function loadSandboxJS() {
      return new RSVP.Promise(function(resolve, reject) {
        resolve(fetchResource(oasis.sandbox.options.url, oasis).then(applySandboxJS));
      });
    }
  }
});

var inlineAdapter = new InlineAdapter();

export default inlineAdapter;
