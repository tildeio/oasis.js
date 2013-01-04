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
define("oasis/sandbox",
  ["rsvp"],
  function(RSVP) {
    "use strict";

    function assert(string, assertion) {
      if (!assertion) {
        throw new Error(string);
      }
    }

    var Oasis = exports;

    var oasisId = 'oasis' + (+new Date()), requestId = 0;
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
      },

      receive: function(eventName, callback, binding) {
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

    Oasis.connect = function(capability) {
      var promise = new RSVP.Promise();

      Oasis.registerHandler(capability, {
        setupCapability: function(port) {
          promise.resolve(port);
        }
      });

      return promise;
    };

    Oasis.portFor = function(capability) {
      var port = ports[capability];
      assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
      return port;
    };

    return Oasis;
  });
exports.OasisSandbox = requireModule('oasis/sandbox');
})(window);