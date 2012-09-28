(function(exports) {
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

  function verifySeamless() {
    var iframe = document.createElement('iframe');

    iframe.seamless = true;
    assert(iframe.getAttribute('seamless') !== null, "Your platform does not support seamless iframes, and you have not provided a width and height to `createSandbox`. At present, only Chrome Canary supports Seamless iframes");
  }

  verifySandbox();

  var Oasis = exports.Oasis || {};

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
      var promise = new Oasis.Promise();
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
        var promise = new Oasis.Promise();
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

  Oasis.createSandbox = function(options) {
    var pkg = packages[options.url];
    assert(pkg, "You are trying to create a sandbox from an unregistered URL. Please use Oasis.register to register your package.");

    var iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    iframe.seamless = true;
    iframe.src = options.url;

    if (!options.width || !options.height) {
      verifySeamless();
    }

    if (options.width) {
      iframe.width = options.width;
    } else if (options.height) {
      iframe.height = options.height;
    }

    iframe.addEventListener('load', function() {
      var capabilities = pkg.capabilities, services = options.services, ports = [];

      capabilities.forEach(function(capability) {
        var channel = new OasisMessageChannel(),
            service = services[capability];

        channel.port1.port.start();
        service.sandboxLoaded(channel.port1, capability);
        ports.push(channel.port2.port);
      });

      iframe.contentWindow.postMessage(capabilities, ports, '*');
    });

    return iframe;
  };

  exports.Oasis = Oasis;
})(this);

