import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { assert, verifySandbox } from "oasis/util";
import "oasis/state" as State;
import "oasis/sandbox" as Sandbox;

import { OasisPort, PostMessagePort } from "oasis/message_channel";
import "oasis/service" as Service;
import { handlers, ports } from "oasis/ports";

import "oasis/iframe_adapter" as iframeAdapter;
import "oasis/webworker_adapter" as webworkerAdapter;

var Oasis = {};

Logger.enable();

//verifySandbox();

Oasis.adapters = {
  iframe: iframeAdapter,
  webworker: webworkerAdapter
};


/**
  This is the entry point that allows the containing environment to create a
  child sandbox.

  Options:

  * `capabilities`: an array of registered services
  * `url`: a registered URL to a JavaScript file that will initialize the
    sandbox in the sandboxed environment
  * `adapter`: a reference to an adapter that will handle the lifecycle
    of the sandbox. Right now, there are iframe and web worker adapters.

  @param {Object} options
*/
Oasis.createSandbox = function(options) {
  return new Sandbox(options);
};

Oasis.Service = Oasis.Consumer = Service;

var packages = State.packages;
Oasis.reset = function() {
  State.reset();
  packages = State.packages;
};
Oasis.reset();


/**
  This registers a sandbox type inside of the containing environment so that
  it can be referenced by URL in `createSandbox`.

  Options:

  * `capabilities`: An array of service names that will be supplied when calling
    `createSandbox`
  * `url`: The URL of the JavaScript file that contains the sandbox code

  @param {Object} options
*/
Oasis.register = function(options) {
  assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

  packages[options.url] = options;
};

// init
if (typeof window !== 'undefined') {
  iframeAdapter.connectSandbox(ports);
} else {
  Oasis.adapters.webworker.connectSandbox(ports);
}

Oasis.registerHandler = function(capability, options) {
  var port = ports[capability];

  if (port) {
    options.setupCapability(port);

    if (options.promise) {
      options.promise.then(function() {
        port.start();
      });
    } else {
      port.start();
    }
  } else {
    handlers[capability] = options;
  }
};

Oasis.consumers = {};

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
Oasis.connect = function(capability, callback) {
  function setupCapability(Consumer, name) {
    return function(port) {
      var consumer = new Consumer(port);
      Oasis.consumers[name] = consumer;
      consumer.initialize(port, name);
      port.start();
    };
  }

  if (typeof capability === 'object') {
    var consumers = capability.consumers;

    for (var prop in consumers) {
      Oasis.registerHandler(prop, {
        setupCapability: setupCapability(consumers[prop], prop)
      });
    }
  } else if (callback) {
    Logger.log("Connecting to '" + capability + "' with callback.");

    Oasis.registerHandler(capability, {
      setupCapability: function(port) {
        callback(port);
      }
    });
  } else {
    Logger.log("Connecting to '" + capability + "' with promise.");

    var defered = RSVP.defer();
    Oasis.registerHandler(capability, {
      promise: defered.promise,
      setupCapability: function(port) {
        defered.resolve(port);
      }
    });
    return defered.promise;
  }
};

Oasis.portFor = function(capability) {
  var port = ports[capability];
  assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
  return port;
};

Oasis.RSVP = RSVP;

export = Oasis;
