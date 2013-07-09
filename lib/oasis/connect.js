import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { assert, rsvpErrorHandler } from "oasis/util";
import { a_forEach } from "oasis/shims";

import "oasis/state" as State;
import { handlers, ports } from "oasis/globals";
import { PostMessagePort } from "oasis/message_channel";

var receivedPorts = false;

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
  } else if (!receivedPorts) {
    Logger.log("No port found, saving handler for '" + capability + "'");
    handlers[capability] = options;
  } else {
    Logger.log("No port was sent for capability '" + capability + "'");
    options.rejectCapability();
  }
};

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
function connect(capability, callback, errorCallback) {
  if (typeof capability === 'object') {
    return connectConsumers(capability.consumers);
  } else if (callback) {
    return connectCallbacks(capability, callback, errorCallback);
  } else {
    return connectPromise(capability);
  }
};

function connectConsumers(consumers) {
  function setupCapability(Consumer, name) {
    return function(port) {
      var consumer = new Consumer(port);
      State.consumers[name] = consumer;
      consumer.initialize(port, name);
      port.start();
    };
  }

  for (var prop in consumers) {
    registerHandler(prop, {
      setupCapability: setupCapability(consumers[prop], prop),
      rejectCapability: function () {
        (new consumers[prop]).error();
      }
    });
  }
}

function connectCallbacks(capability, callback, errorCallback) {
  Logger.log("Connecting to '" + capability + "' with callback.");

  registerHandler(capability, {
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

function connectPromise(capability) {
  Logger.log("Connecting to '" + capability + "' with promise.");

  var defered = RSVP.defer();
  registerHandler(capability, {
    promise: defered.promise,
    setupCapability: function(port) {
      defered.resolve(port);
    },
    rejectCapability: function () {
      defered.reject();
    }
  });
  return defered.promise;
}

function connectCapabilities(capabilities, eventPorts) {
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

  // TODO: for each handler w/o capability, reject

  receivedPorts = true;
}

function portFor(capability) {
  var port = ports[capability];
  assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
  return port;
};

export { registerHandler, connect, connectCapabilities, portFor };
