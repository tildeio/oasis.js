define("oasis",
  ["rsvp"],
  function(RSVP) {
    "use strict";

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

            if (service) {
              /*jshint newcap:false*/
              service = new service(channel.port1, sandbox);
              service.initialize(channel.port1, capability);
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

    Oasis.Service = function(port, sandbox) {
      var service = this, prop, callback;

      this.sandbox = sandbox;
      this.port = port;

      function xform(callback) {
        return function() {
          callback.apply(service, arguments);
        };
      }

      for (prop in this.events) {
        callback = this.events[prop];
        port.on(prop, xform(callback));
      }

      for (prop in this.requests) {
        callback = this.requests[prop];
        port.onRequest(prop, xform(callback));
      }
    };

    Oasis.Service.prototype = {
      initialize: function() {},

      send: function() {
        return this.port.send.apply(this.port, arguments);
      },

      request: function() {
        return this.port.request.apply(this.port, arguments);
      }
    };

    Oasis.Service.extend = function(object) {
      function Service() {
        Oasis.Service.apply(this, arguments);
      }

      var ServiceProto = Service.prototype = Object.create(Oasis.Service.prototype);

      for (var prop in object) {
        ServiceProto[prop] = object[prop];
      }

      return Service;
    };

    Oasis.Consumer = Oasis.Service;

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

      onRequest: function(eventName, callback, binding) {
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

    var ports = {};
    window.addEventListener('message', function(event) {
      var capabilities = event.data, eventPorts = event.ports;

      capabilities.forEach(function(capability, i) {
        var handler = handlers[capability],
            port = new OasisPort(eventPorts[i]);

        if (handler && handler.setupCapability) {
          handler.setupCapability(port);
        }

        port.port.start();

        ports[capability] = port;
      });
    });

    var handlers = {};
    Oasis.registerHandler = function(capability, options) {
      handlers[capability] = options;
    };

    Oasis.consumers = {};

    Oasis.connect = function(capability) {
      function setupCapability(Consumer, name) {
        return function(port) {
          var consumer = new Consumer(port);
          Oasis.consumers[name] = consumer;
          consumer.initialize(port, name);
        };
      }

      if (typeof capability === 'object') {
        var consumers = capability.consumers;

        for (var prop in consumers) {
          Oasis.registerHandler(prop, {
            setupCapability: setupCapability(consumers[prop], prop)
          });
        }
      } else {
        var promise = new RSVP.Promise();
        Oasis.registerHandler(capability, {
          setupCapability: function(port) {
            promise.resolve(port);
          }
        });

        return promise;
      }
    };

    Oasis.portFor = function(capability) {
      var port = ports[capability];
      assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
      return port;
    };

    return Oasis;
  });