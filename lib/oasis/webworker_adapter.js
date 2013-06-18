import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { extend } from "oasis/util";

import "oasis/base_adapter" as BaseAdapter;

import { handlers } from "oasis/ports";

var WebworkerAdapter = extend(BaseAdapter, {
  initializeSandbox: function(sandbox) {
    var oasisURL = this.oasisURL(sandbox);
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
  
  connectPorts: function(sandbox, ports) {
    var rawPorts = ports.map(function(port) { return port.port; }),
        message = this.createInitializationMessage(sandbox);

    Worker.postMessage(sandbox.worker, message, rawPorts);
  },

  connectSandbox: function(ports) {
    return BaseAdapter.prototype.connectSandbox.call(this, self, ports);
  }
});

var webworkerAdapter = new WebworkerAdapter;

export = webworkerAdapter;
