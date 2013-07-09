import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { extend } from "oasis/util";
import { a_forEach, addEventListener, removeEventListener } from "oasis/shims";

import "oasis/base_adapter" as BaseAdapter;

var WebworkerAdapter = extend(BaseAdapter, {
  initializeSandbox: function(sandbox) {
    var oasisURL = this.oasisURL(sandbox);
    var worker = new Worker(oasisURL);
    sandbox.worker = worker;

    sandbox.promise = new RSVP.Promise( function(resolve, reject) {
      worker.initializationHandler = function (event) {
        if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
        removeEventListener(worker, 'message', worker.initializationHandler);

        Logger.log("worker sandbox initialized");
        resolve(sandbox);
      };
      addEventListener(worker, 'message', worker.initializationHandler);
    });

    return new RSVP.Promise(function (resolve, reject) {
      worker.loadHandler = function (event) {
        if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
        removeEventListener(worker, 'message', worker.loadHandler);

        Logger.log("worker sandbox initialized");
        resolve(sandbox);
      };
      addEventListener(worker, 'message', worker.loadHandler);
    });
  },

  loadScripts: function (base, scriptURLs) {
    var hrefs = [];
    a_forEach.call(scriptURLs, function (scriptURL) {
      hrefs.push( base + scriptURL );
    });

    importScripts.apply(undefined, hrefs);
  },

  oasisLoaded: function() {
    postMessage(this.oasisLoadedMessage, []);
  },

  didConnect: function() {
    postMessage(this.sandboxInitializedMessage, []);
  },

  startSandbox: function(sandbox) { },

  terminateSandbox: function(sandbox) {
    var worker = sandbox.worker;

    removeEventListener(worker, 'message', worker.loadHandler);
    removeEventListener(worker, 'message', worker.initializationHandler);
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
