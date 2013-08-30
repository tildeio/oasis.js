/*global self, postMessage, importScripts, UUID */

import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert, extend } from "oasis/util";
import { configuration } from "oasis/config";
import { a_forEach, addEventListener, removeEventListener } from "oasis/shims";

import BaseAdapter from "oasis/base_adapter";

var WebworkerAdapter = extend(BaseAdapter, {
  //-------------------------------------------------------------------------
  // Environment API

  initializeSandbox: function(sandbox) {
    assert(sandbox.type !== 'html', "Webworker adapter only supports type `js` sandboxes, but type `html` was requested.");

    var oasisURL = this.oasisURL(sandbox);
    var worker = new Worker(oasisURL);
    worker.name = sandbox.options.url + '?uuid=' + UUID.generate();
    sandbox.worker = worker;

    sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
      worker.initializationHandler = function (event) {
        configuration.eventCallback(function () {
          if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
          removeEventListener(worker, 'message', worker.initializationHandler);

          Logger.log("worker sandbox initialized");
          resolve(sandbox);
        });
      };
      addEventListener(worker, 'message', worker.initializationHandler);
    }));

    return new RSVP.Promise(function (resolve, reject) {
      worker.loadHandler = function (event) {
        configuration.eventCallback(function () {
          if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
          removeEventListener(worker, 'message', worker.loadHandler);

          Logger.log("worker sandbox initialized");
          resolve(sandbox);
        });
      };
      addEventListener(worker, 'message', worker.loadHandler);
    });
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

  connectSandbox: function(oasis) {
    return BaseAdapter.prototype.connectSandbox.call(this, self, oasis);
  },

  //-------------------------------------------------------------------------
  // Sandbox API

  loadScripts: function (base, scriptURLs) {
    var hrefs = [];
    a_forEach.call(scriptURLs, function (scriptURL) {
      hrefs.push( base + scriptURL );
    });

    importScripts.apply(undefined, hrefs);
  },

  name: function(sandbox) {
    return sandbox.worker.name;
  },

  oasisLoaded: function() {
    postMessage(this.oasisLoadedMessage, []);
  },

  didConnect: function() {
    postMessage(this.sandboxInitializedMessage, []);
  }
});

var webworkerAdapter = new WebworkerAdapter();

export default webworkerAdapter;
