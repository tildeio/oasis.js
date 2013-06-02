import "rsvp" as RSVP;
import "oasis/logger" as Logger;

import { handlers } from "oasis/ports";
import { PostMessagePort, PostMessageMessageChannel } from "oasis/message_channel";

function log(){
  return Logger.log.apply(this, arguments);
}

var URLObject;
if (typeof URL !== 'undefined') {
  URLObject = URL;
} else if (typeof webkitURL !== 'undefined') {
  URLObject = webkitURL;
} else {
  assert(false, "The current version of Oasis requires a way to creat e object URLs (URL or webkitURL for example), which is not supported on your current platform.");
}

function generateWebWorkerURL(sandboxURL, dependencyURLs) {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  dependencyURLs = dependencyURLs || [];

  function importScriptsString(url) {
    return "importScripts('" + base + url + "'); ";
  }

  var src = importScriptsString("oasis.js.html");
  dependencyURLs.forEach(function(url) {
    src += importScriptsString(url);
  });
  src += importScriptsString(sandboxURL);

  var blob = new Blob([src], {type: "application/javascript"});
  return URLObject.createObjectURL(blob);
}

var webworkerAdapter = {
  initializeSandbox: function(sandbox) {
    var url = generateWebWorkerURL(sandbox.options.url, sandbox.dependencies);
    var worker = new Worker(url);
    sandbox.worker = worker;
    return new RSVP.Promise(function (resolve, reject) {
      setTimeout(function() {
        log("webworker sandbox initialized");
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
    Worker.postMessage(sandbox.worker, { isOasisInitialization: true, capabilities: sandbox.capabilities }, rawPorts);
  },

  startSandbox: function(sandbox) { },

  terminateSandbox: function(sandbox) {
    sandbox.worker.terminate();
  },

  connectSandbox: function(ports) {
    self.addEventListener('message', function(event) {
      debugger;
      if (!event.data.isOasisInitialization) { return; }

      var capabilities = event.data.capabilities, eventPorts = event.ports;

      capabilities.forEach(function(capability, i) {
        var handler = handlers[capability],
            port = new PostMessagePort(eventPorts[i]);

        if (handler) {
          handler.setupCapability(port);
          port.start();
        }

        ports[capability] = port;
      });
    });
  }
};

export = webworkerAdapter;
