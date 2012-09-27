(function(exports) {
  "use strict";

  function assert(string, assertion) {
    if (!assertion) {
      throw new Error(string);
    }
  }

  var Oasis = exports.Oasis || {};

  var OasisPort = function(port) {
    this.port = port;
  };

  OasisPort.prototype = {
    on: function() {

    },

    send: function() {

    },

    request: function() {

    }
  };

  var ports = {};
  window.addEventListener('message', function(event) {
    var capabilities = event.data, ports = event.ports;

    capabilities.forEach(function(capability, i) {
      var handler = capabilities[capability], port = ports[i];

      if (handler.setupCapability) {
        handler.setupCapability(ports[i]);
      }

      ports[capability] = port;
    });
  });

  var handlers = {};
  Oasis.registerHandler = function(capability, options) {
    handlers[capability] = options;
  };

  Oasis.portFor = function(capability) {
    var port = ports[capability];
    assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
    return port;
  };

  exports.Oasis = Oasis;
})(this);
