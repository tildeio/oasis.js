import "rsvp" as RSVP;

function assert(assertion, string) {
  if (!assertion) {
    throw new Error(string);
  }
}

function verifySandbox() {
  var iframe = document.createElement('iframe');

  iframe.sandbox = 'allow-scripts';
  assert(iframe.getAttribute('sandbox') === 'allow-scripts', "The current version of Oasis requires Sandboxed iframes, which are not supported on your current platform. See http://caniuse.com/#feat=iframe-sandbox");

  assert(typeof MessageChannel !== 'undefined', "The current version of Oasis requires MessageChannel, which is not supported on your current platform. A near-future version of Oasis will polyfill MessageChannel using the postMessage API");
}

verifySandbox();

var Oasis = {};

// SANDBOXES

var OasisSandbox = function() {
  this.connections = {};
};

OasisSandbox.prototype = {
  connect: function(capability) {
    var promise = new RSVP.Promise();
    var connections;

    connections = this.connections[capability];
    connections = connections || [];

    connections.push(promise);
    this.connections[capability] = connections;

    return promise;
  },

  triggerConnect: function(capability, port) {
    var connections = this.connections[capability];

    if (connections) {
      connections.forEach(function(connection) {
        connection.resolve(port);
      });

      this.connections[capability] = [];
    }
  }
};

Oasis.createSandbox = function(options) {
  var capabilities;
  if (options.capabilities) {
    capabilities = options.capabilities;
  } else {
    var pkg = packages[options.url];
    assert(pkg, "You are trying to create a sandbox from an unregistered URL without providing capabilities. Please use Oasis.register to register your package or pass a list of capabilities to createSandbox.");
    capabilities = pkg.capabilities;
  }

  var sandbox = new OasisSandbox();

  var iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-scripts';
  iframe.seamless = true;
  iframe.src = options.url;

  if (options.width) {
    iframe.width = options.width;
  } else if (options.height) {
    iframe.height = options.height;
  }

  iframe.addEventListener('load', function() {
    var services = options.services || {};
    var ports = [];

    capabilities.forEach(function(capability) {
      var service = services[capability],
          channel, port;

      // If an existing port is provided, just
      // pass it along to the new sandbox.

      if (service && service.port instanceof MessagePort) {
        port = service.port;
      } else {
        channel = new OasisMessageChannel(),
        channel.port1.port.start();

        if (service && service.sandboxLoaded) {
          service.sandboxLoaded(channel.port1, capability);
        }

        sandbox.triggerConnect(capability, channel.port1);
        port = channel.port2.port;
      }

      ports.push(port);
    });

    iframe.contentWindow.postMessage(capabilities, ports, '*');
  });

  sandbox.el = iframe;

  return sandbox;
};

// PORTS

var packages, requestId, oasisId;
Oasis.reset = function() {
  packages = {};
  requestId = 0;
  oasisId = 'oasis' + (+new Date());
};
Oasis.reset();

var getRequestId = function() {
  return oasisId + '-' + requestId++;
};

var OasisPort = function(port) {
  this.port = port;
};

OasisPort.prototype = {
  on: function(eventName, callback, binding) {
    this.port.addEventListener('message', function(event) {
      if (event.data.type === eventName) {
        callback.call(binding, event.data.data);
      }
    });
  },

  off: function() {
    // TODO: Implement
  },

  send: function(eventName, data) {
    this.port.postMessage({
      type: eventName,
      data: data
    });
  },

  request: function(eventName) {
    var promise = new RSVP.Promise();
    var requestId = getRequestId();

    var observer = function(event) {
      if (event.requestId === requestId) {
        this.off('@response:' + eventName, observer);
        promise.resolve(event.data);
      }
    };

    this.on('@response:' + eventName, observer, this);
    this.send('@request:' + eventName, { requestId: requestId });

    return promise;
  },

  fulfill: function(eventName, callback, binding) {
    var self = this;

    this.on('@request:' + eventName, function(data) {
      var promise = new RSVP.Promise();
      var requestId = data.requestId;

      promise.then(function(data) {
        self.send('@response:' + eventName, {
          requestId: requestId,
          data: data
        });
      });

      callback.call(binding, promise);
    });
  }
};

var OasisMessageChannel = function() {
  this.channel = new MessageChannel();
  this.port1 = new OasisPort(this.channel.port1);
  this.port2 = new OasisPort(this.channel.port2);
};

OasisMessageChannel.prototype = {
  start: function() {
    this.port1.port.start();
    this.port2.port.start();
  }
};

Oasis.register = function(options) {
  assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

  packages[options.url] = options;
};

export = Oasis;
