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