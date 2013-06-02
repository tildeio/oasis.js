import "rsvp" as RSVP;
import "oasis/logger" as Logger;

import { handlers } from "oasis/ports";
import { PostMessagePort, PostMessageMessageChannel } from "oasis/message_channel";

function generateSrc(sandboxURL, oasisURL, dependencyURLs) {
  function importScripts() {}

  dependencyURLs = dependencyURLs || [];
  oasisURL = oasisURL || "oasis.js.html";

  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  var src = "data:text/html,<!doctype html>";
  src += "<base href='" + base + "'>";
  src += "<script src='"+oasisURL+"'><" + "/script>";
  src += "<script>" + importScripts.toString() + "<" + "/script>";
  dependencyURLs.forEach(function(url) {
    src += "<script src='" + url + "'><" + "/script>";
  });
  src += "<script src='" + sandboxURL + "'><" + "/script>";
  return src;
}

var iframeAdapter = {
  initializeSandbox: function(sandbox) {
    var options = sandbox.options,
        iframe = document.createElement('iframe'),
        promise;

    iframe.sandbox = 'allow-same-origin allow-scripts';
    iframe.seamless = true;
    iframe.src = generateSrc(options.url, options.oasisURL, sandbox.dependencies);

    // rendering-specific code
    if (options.width) {
      iframe.width = options.width;
    } else if (options.height) {
      iframe.height = options.height;
    }


    sandbox.el = iframe;

    return new RSVP.Promise(function (resolve, reject) {
      iframe.addEventListener('load', function() {
        Logger.log("iframe sandbox initialized");
        resolve(sandbox);
      });
    });
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

  connectPorts: function(sandbox, ports) {
    var rawPorts = ports.map(function(port) { return port.port; });
    Window.postMessage(sandbox.el.contentWindow, { isOasisInitialization: true, capabilities: sandbox.capabilities }, rawPorts, '*');
  },

  startSandbox: function(sandbox) {
    document.head.appendChild(sandbox.el);
  },

  terminateSandbox: function(sandbox) {
    var el = sandbox.el;

    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },

  // SANDBOX HOOKS
  connectSandbox: function(ports) {
    Logger.log("Listening for initialization message");

    window.addEventListener('message', function(event) {
      if (!event.data.isOasisInitialization) { return; }

      Logger.log("Sandbox initializing.");

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
    });
  }
};

export = iframeAdapter;
