import RSVP from "rsvp";

import Logger from "oasis/logger";
import { mustImplement } from "oasis/util";
import { addEventListener, removeEventListener, a_indexOf, a_filter } from "oasis/shims";

import { connectCapabilities } from "oasis/connect";
import { PostMessageMessageChannel } from "oasis/message_channel";

function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
}

function BaseAdapter() {
  this._unsupportedCapabilities = [];
}

BaseAdapter.prototype = {
  initializeSandbox: mustImplement('BaseAdapter', 'initializeSandbox'),
  loadScripts: mustImplement('BaseAdapter', 'loadScripts'),
  name: mustImplement('BaseAdapter', 'name'),

  oasisURL: function(sandbox) {
    return sandbox.options.oasisURL || sandbox.oasis.configuration.oasisURL || 'oasis.js.html';
  },

  unsupportedCapabilities: function () {
    return this._unsupportedCapabilities;
  },

  addUnsupportedCapability: function (capability) {
    this._unsupportedCapabilities.push(capability);
  },

  filterCapabilities: function(capabilities) {
    var unsupported = this._unsupportedCapabilities;
    return a_filter.call(capabilities, function (capability) {
      var index = a_indexOf.call(unsupported, capability);
      return index === -1;
    });
  },

  createChannel: function(oasis) {
    var channel = new PostMessageMessageChannel(oasis);
    channel.port1.start();
    return channel;
  },

  environmentPort: function(sandbox, channel) {
    return channel.port1;
  },

  sandboxPort: function(sandbox, channel) {
    return channel.port2;
  },

  proxyPort: function(sandbox, port) {
    return port;
  },

  connectSandbox: function (receiver, oasis) {
    var adapter = this;

    Logger.log("Sandbox listening for initialization message");

    function initializeOasisSandbox(event) {
      if (!event.data.isOasisInitialization) { return; }

      removeEventListener(receiver, 'message', initializeOasisSandbox);
      adapter.initializeOasisSandbox(event, oasis);
    }
    addEventListener(receiver, 'message', initializeOasisSandbox);

    adapter.oasisLoaded(oasis);
  },

  initializeOasisSandbox: function (event, oasis) {
    var adapter = this;
    oasis.configuration.eventCallback(function () {
      Logger.log("Sandbox received initialization message.");

      oasis.configuration.oasisURL = event.data.oasisURL;

      adapter.loadScripts(event.data.base, event.data.scriptURLs, oasis);

      oasis.connectCapabilities(event.data.capabilities, event.ports);

      adapter.didConnect(oasis);
    });
  },

  createInitializationMessage: function (sandbox) {
    var scriptURLs = this.generateScriptURLs(sandbox);

    return {
      isOasisInitialization: true,
      capabilities: sandbox._capabilitiesToConnect,
      base: getBase(),
      scriptURLs: scriptURLs,
      oasisURL: this.oasisURL(sandbox)
    };
  },

  generateScriptURLs: function (sandbox) {
    var sandboxURL = sandbox.options.url,
        scriptURLs = [].concat(sandbox.dependencies || []);

    if (sandbox.type === 'js') {
      scriptURLs.push(sandboxURL);
    }
        
    return scriptURLs;
  },

  oasisLoadedMessage: "oasisSandboxLoaded",
  sandboxInitializedMessage:  "oasisSandboxInitialized"
};

export default BaseAdapter;
