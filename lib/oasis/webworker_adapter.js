import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { extend } from "oasis/util";

import "oasis/base_adapter" as BaseAdapter;

import { handlers } from "oasis/ports";

// TODO: move to base adapter
function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
};

var WebworkerAdapter = extend(BaseAdapter, {
  initializeSandbox: function(sandbox) {
    var oasisURL = sandbox.options.oasisURL || 'oasis.js.html';
    var worker = new Worker(oasisURL);
    sandbox.worker = worker;
    return new RSVP.Promise(function (resolve, reject) {
      setTimeout(function() {
        Logger.log("webworker sandbox initialized");
        resolve(sandbox);
      });
    });
  },

  loadScripts: function (base, scriptURLs) {
    scriptURLs.forEach(function (scriptURL) {
      importScripts(base + scriptURL);
    });
  },

  startSandbox: function(sandbox) { },

  terminateSandbox: function(sandbox) {
    sandbox.worker.terminate();
  },
  
  // TODO: this.createInitializationMessage (in baseadapter)
  connectPorts: function(sandbox, ports) {
    var rawPorts = ports.map(function(port) { return port.port; }),
        sandboxURL = sandbox.options.url,
        scriptURLs = [sandboxURL].concat(sandbox.dependencies || []);

    Worker.postMessage(sandbox.worker, {
      isOasisInitialization: true,
      capabilities: sandbox.capabilities,
      base: getBase(),
      scriptURLs: scriptURLs
    }, rawPorts);
  },

  connectSandbox: function(ports) {
    return BaseAdapter.prototype.connectSandbox.call(this, self, ports);
  }
});

var webworkerAdapter = new WebworkerAdapter;

export = webworkerAdapter;
