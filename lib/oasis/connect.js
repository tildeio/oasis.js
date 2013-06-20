import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { assert, rsvpErrorHandler } from "oasis/util";

import "oasis/state" as State;
import { handlers, ports } from "oasis/ports";

function registerHandler(capability, options) {
  var port = ports[capability];

  if (port) {
    Logger.log("Found port, setting up '" + capability + "'");
    options.setupCapability(port);

    if (options.promise) {
      options.promise.then(function() {
        port.start();
      }).then(null, rsvpErrorHandler);
    } else {
      port.start();
    }
  } else {
    Logger.log("No port found, saving handler for '" + capability + "'");
    handlers[capability] = options;
  }
};

/**
  This is the main entry point that allows sandboxes to connect back
  to their containing environment.

  It should be called once for each service provided by the containing
 environment that it wants to connect to.

  @param {String} serviceName the name of the service to connect to
  @param {Function?} callback the callback to trigger once the other
    side of the connection is available
  @return {Promise} a promise that will be resolved once the other
    side of the connection is available. You can use this instead
    of the callback.
*/
function connect(capability, callback) {
  function setupCapability(Consumer, name) {
    return function(port) {
      var consumer = new Consumer(port);
      State.consumers[name] = consumer;
      consumer.initialize(port, name);
      port.start();
    };
  }

  if (typeof capability === 'object') {
    var consumers = capability.consumers;

    for (var prop in consumers) {
      registerHandler(prop, {
        setupCapability: setupCapability(consumers[prop], prop)
      });
    }
  } else if (callback) {
    Logger.log("Connecting to '" + capability + "' with callback.");

    registerHandler(capability, {
      setupCapability: function(port) {
        callback(port);
      }
    });
  } else {
    Logger.log("Connecting to '" + capability + "' with promise.");

    var defered = RSVP.defer();
    registerHandler(capability, {
      promise: defered.promise,
      setupCapability: function(port) {
        defered.resolve(port);
      }
    });
    return defered.promise;
  }
};

function portFor(capability) {
  var port = ports[capability];
  assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
  return port;
};

export { registerHandler, connect, portFor };
