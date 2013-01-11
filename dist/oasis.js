(function(exports) {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(deps[i]));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;
  };
})();
define("rsvp",
  [],
  function() {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};

    var MutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var RSVP, async;

    if (typeof process !== 'undefined' &&
      {}.toString.call(process) === '[object process]') {
      async = function(callback, binding) {
        process.nextTick(function() {
          callback.call(binding);
        });
      };
    } else if (MutationObserver) {
      var queue = [];

      var observer = new MutationObserver(function() {
        var toProcess = queue.slice();
        queue = [];

        toProcess.forEach(function(tuple) {
          var callback = tuple[0], binding = tuple[1];
          callback.call(binding);
        });
      });

      var element = document.createElement('div');
      observer.observe(element, { attributes: true });

      // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
      window.addEventListener('unload', function(){
        observer.disconnect();
        observer = null;
      });

      async = function(callback, binding) {
        queue.push([callback, binding]);
        element.setAttribute('drainQueue', 'drainQueue');
      };
    } else {
      async = function(callback, binding) {
        setTimeout(function() {
          callback.call(binding);
        }, 1);
      };
    }

    var Event = function(type, options) {
      this.type = type;

      for (var option in options) {
        if (!options.hasOwnProperty(option)) { continue; }

        this[option] = options[option];
      }
    };

    var indexOf = function(callbacks, callback) {
      for (var i=0, l=callbacks.length; i<l; i++) {
        if (callbacks[i][0] === callback) { return i; }
      }

      return -1;
    };

    var callbacksFor = function(object) {
      var callbacks = object._promiseCallbacks;

      if (!callbacks) {
        callbacks = object._promiseCallbacks = {};
      }

      return callbacks;
    };

    var EventTarget = {
      mixin: function(object) {
        object.on = this.on;
        object.off = this.off;
        object.trigger = this.trigger;
        return object;
      },

      on: function(eventNames, callback, binding) {
        var allCallbacks = callbacksFor(this), callbacks, eventName;
        eventNames = eventNames.split(/\s+/);
        binding = binding || this;

        while (eventName = eventNames.shift()) {
          callbacks = allCallbacks[eventName];

          if (!callbacks) {
            callbacks = allCallbacks[eventName] = [];
          }

          if (indexOf(callbacks, callback) === -1) {
            callbacks.push([callback, binding]);
          }
        }
      },

      off: function(eventNames, callback) {
        var allCallbacks = callbacksFor(this), callbacks, eventName, index;
        eventNames = eventNames.split(/\s+/);

        while (eventName = eventNames.shift()) {
          if (!callback) {
            allCallbacks[eventName] = [];
            continue;
          }

          callbacks = allCallbacks[eventName];

          index = indexOf(callbacks, callback);

          if (index !== -1) { callbacks.splice(index, 1); }
        }
      },

      trigger: function(eventName, options) {
        var allCallbacks = callbacksFor(this),
            callbacks, callbackTuple, callback, binding, event;

        if (callbacks = allCallbacks[eventName]) {
          for (var i=0, l=callbacks.length; i<l; i++) {
            callbackTuple = callbacks[i];
            callback = callbackTuple[0];
            binding = callbackTuple[1];

            if (typeof options !== 'object') {
              options = { detail: options };
            }

            event = new Event(eventName, options);
            callback.call(binding, event);
          }
        }
      }
    };

    var Promise = function() {
      this.on('promise:resolved', function(event) {
        this.trigger('success', { detail: event.detail });
      }, this);

      this.on('promise:failed', function(event) {
        this.trigger('error', { detail: event.detail });
      }, this);
    };

    var noop = function() {};

    var invokeCallback = function(type, promise, callback, event) {
      var hasCallback = typeof callback === 'function',
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(event.detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = event.detail;
        succeeded = true;
      }

      if (value && typeof value.then === 'function') {
        value.then(function(value) {
          promise.resolve(value);
        }, function(error) {
          promise.reject(error);
        });
      } else if (hasCallback && succeeded) {
        promise.resolve(value);
      } else if (failed) {
        promise.reject(error);
      } else {
        promise[type](value);
      }
    };

    Promise.prototype = {
      then: function(done, fail) {
        var thenPromise = new Promise();

        if (this.isResolved) {
          RSVP.async(function() {
            invokeCallback('resolve', thenPromise, done, { detail: this.resolvedValue });
          }, this);
        }

        if (this.isRejected) {
          RSVP.async(function() {
            invokeCallback('reject', thenPromise, fail, { detail: this.rejectedValue });
          }, this);
        }

        this.on('promise:resolved', function(event) {
          invokeCallback('resolve', thenPromise, done, event);
        });

        this.on('promise:failed', function(event) {
          invokeCallback('reject', thenPromise, fail, event);
        });

        return thenPromise;
      },

      resolve: function(value) {
        resolve(this, value);

        this.resolve = noop;
        this.reject = noop;
      },

      reject: function(value) {
        reject(this, value);

        this.resolve = noop;
        this.reject = noop;
      }
    };

    function resolve(promise, value) {
      RSVP.async(function() {
        promise.trigger('promise:resolved', { detail: value });
        promise.isResolved = true;
        promise.resolvedValue = value;
      });
    }

    function reject(promise, value) {
      RSVP.async(function() {
        promise.trigger('promise:failed', { detail: value });
        promise.isRejected = true;
        promise.rejectedValue = value;
      });
    }

    EventTarget.mixin(Promise.prototype);

    RSVP = { async: async, Promise: Promise, Event: Event, EventTarget: EventTarget };
    return RSVP;
  });
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
exports.Oasis = requireModule('oasis');
})(window);