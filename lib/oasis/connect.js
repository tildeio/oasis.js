import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert } from "oasis/util";
import { a_forEach } from "oasis/shims";

import { PostMessagePort } from "oasis/message_channel";

export function registerHandler(oasis, capability, options) {
  var port = oasis.ports[capability];

  if (port) {
    Logger.log(oasis.oasisId, "sandbox: found port, setting up '" + capability + "'");
    options.setupCapability(port);

    if (options.promise) {
      options.promise.then(function() {
        port.start();
      }).fail(RSVP.rethrow);
    } else {
      port.start();
    }
  } else if (!oasis.receivedPorts) {
    Logger.log("No port found, saving handler for '" + capability + "'");
    oasis.handlers[capability] = options;
  } else {
    Logger.log("No port was sent for capability '" + capability + "'");
    options.rejectCapability();
  }
}

/**
  This is the main entry point that allows sandboxes to connect back
  to their containing environment.

  It can be called either with a set of named consumers, with callbacks, or using promises.

  Example

    // Using promises
    Oasis.connect('foo').then( function (port) {
      port.send('hello');
    }, function () {
      // error
    });


    // using callbacks
    Oasis.connect('foo', function (port) {
      port.send('hello');
    }, errorHandler);


    // connecting several consumers at once.
    var ConsumerA = Oasis.Consumer.extend({
      initialize: function (port) { this.port = port; },

      error: function () { }
    });

    var ConsumerB = Oasis.Consumer.extend({
      initialize: function (port) { this.port = port; },

      error: function () { }
    });

    Oasis.connect({
      consumers: {
        capabilityA: ConsumerA,
        capabilityB: ConsumerB
      }
    });

  @param {String} capability the name of the service to connect to, or an object
    containing named consumers to connect.
  @param {Function?} callback the callback to trigger once the other
    side of the connection is available.
  @param {Function?} errorCallback the callback to trigger if the capability is
    not provided by the environment.
  @return {Promise} a promise that will be resolved once the other
    side of the connection is available. You can use this instead
    of the callbacks.
*/
export function connect(capability, callback, errorCallback) {
  if (typeof capability === 'object') {
    return connectConsumers(this, capability.consumers);
  } else if (callback) {
    return connectCallbacks(this, capability, callback, errorCallback);
  } else {
    return connectPromise(this, capability);
  }
}

export function connectCapabilities(capabilities, eventPorts) {
  var oasis = this;
  a_forEach.call(capabilities, function(capability, i) {
    var handler = oasis.handlers[capability],
        port = new PostMessagePort(oasis, eventPorts[i]);

    if (handler) {
      Logger.log("Invoking handler for '" + capability + "'");

      RSVP.resolve(handler.setupCapability(port)).then(function () {
        port.start();
      }).fail(RSVP.rethrow);
    }

    oasis.ports[capability] = port;
  });

  // TODO: for each handler w/o capability, reject

  this.receivedPorts = true;
}

export function portFor(capability) {
  var port = this.ports[capability];
  assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
  return port;
}


function connectConsumers(oasis, consumers) {
  function setupCapability(Consumer, name) {
    return function(port) {
      var consumer = new Consumer(port);
      oasis.consumers[name] = consumer;
      consumer.initialize(port, name);
    };
  }

  function rejectCapability(prop) {
    return function () {
      consumers[prop].prototype.error();
    };
  }

  for (var prop in consumers) {
    registerHandler(oasis, prop, {
      setupCapability: setupCapability(consumers[prop], prop),
      rejectCapability: rejectCapability(prop)
    });
  }
}

function connectCallbacks(oasis, capability, callback, errorCallback) {
  Logger.log("Connecting to '" + capability + "' with callback.");

  registerHandler(oasis, capability, {
    setupCapability: function(port) {
      callback(port);
    },
    rejectCapability: function () {
      if (errorCallback) {
        errorCallback();
      }
    }
  });
}

function connectPromise(oasis, capability) {
  Logger.log("Connecting to '" + capability + "' with promise.");

  var defered = RSVP.defer();
  registerHandler(oasis, capability, {
    promise: defered.promise,
    setupCapability: function(port) {
      defered.resolve(port);
      return defered.promise;
    },
    rejectCapability: function () {
      defered.reject();
    }
  });
  return defered.promise;
}
