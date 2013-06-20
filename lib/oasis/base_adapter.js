import "oasis/logger" as Logger;
import { mustImplement } from "oasis/util";
import { a_forEach, addEventListener, removeEventListener } from "oasis/shims";

import "oasis/config" as configuration;
import { handlers } from "oasis/ports";
import { PostMessagePort, PostMessageMessageChannel } from "oasis/message_channel";

function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
}

function BaseAdapter() {
}

BaseAdapter.prototype = {
  loadScripts: mustImplement('BaseAdapter', 'loadScripts'),

  oasisURL: function(sandbox) {
    return sandbox.options.oasisURL || configuration.oasisURL || 'oasis.js.html';
  },

  createChannel: function(sandbox) {
    var channel = new PostMessageMessageChannel();
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

  connectSandbox: function (receiver, ports) {
    var adapter = this;

    Logger.log("Listening for initialization message");

    function initializeOasisSandbox(event) {
      if (!event.data.isOasisInitialization) { return; }

      Logger.log("Sandbox initializing.");

      configuration.oasisURL = event.data.oasisURL;

      removeEventListener(receiver, 'message', initializeOasisSandbox);
      adapter.loadScripts(event.data.base, event.data.scriptURLs);

      var capabilities = event.data.capabilities, eventPorts = event.ports;

      a_forEach.call(capabilities, function(capability, i) {
        var handler = handlers[capability],
            port = new PostMessagePort(eventPorts[i]);

        if (handler) {
          Logger.log("Invoking handler for '" + capability + "'");

          handler.setupCapability(port);
          port.start();
        }

        ports[capability] = port;
      });
    }
    addEventListener(receiver, 'message', initializeOasisSandbox);
  },

  createInitializationMessage: function (sandbox) {
    var sandboxURL = sandbox.options.url,
        scriptURLs = [sandboxURL].concat(sandbox.dependencies || []);

    return {
      isOasisInitialization: true,
      capabilities: sandbox.capabilities,
      base: getBase(),
      scriptURLs: scriptURLs,
      oasisURL: this.oasisURL(sandbox)
    };
  }
}

export = BaseAdapter;
