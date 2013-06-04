import "oasis/logger" as Logger;
import { mustImplement } from "oasis/util";

import { handlers } from "oasis/ports";
import { PostMessagePort, PostMessageMessageChannel } from "oasis/message_channel";

function BaseAdapter() {
}

BaseAdapter.prototype = {
  loadScripts: mustImplement('BaseAdapter', 'loadScripts'),

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

      receiver.removeEventListener('message', initializeOasisSandbox);
      adapter.loadScripts(event.data.base, event.data.scriptURLs);

      var capabilities = event.data.capabilities, eventPorts = event.ports;

      capabilities.forEach(function(capability, i) {
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
    receiver.addEventListener('message', initializeOasisSandbox);
  }
}

export = BaseAdapter;
