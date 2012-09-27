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
    assert(iframe.getAttribute('seamless') !== null, "Your platform does not support seamless iframes, and you have not provided a width and height to `createCard`. At present, only Chrome Canary supports Seamless iframes");
  }

  verifySandbox();

  var Oasis = exports.Oasis || {};

  var packages;
  Oasis.reset = function() {
    packages = {};
  };
  Oasis.reset();

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

  var OasisMessageChannel = function() {
    this.channel = new MessageChannel();
    this.port1 = this.channel.port1;
    this.port2 = this.channel.port2;
  };

  OasisMessageChannel.prototype = {

  };

  Oasis.register = function(options) {
    assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

    packages[options.url] = options;
  };

  Oasis.createCard = function(options) {
    var pkg = packages[options.url];
    assert(pkg, "You are trying to create a card from an unregistered URL. Please use Oasis.register to register your package.");

    var iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-script';
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

    iframe.addEventListener('loaded', function() {
      var capabilities = pkg.capabilities, services = options.services, ports = [];

      capabilities.forEach(function(capability) {
        var channel = new OasisMessageChannel(),
            service = services[capability];

        service.cardLoaded(channel.port1, capability);
        ports.push(channel.port2);
      });

      iframe.postMessage(capabilities, ports, '*');
    });

    return iframe;
  };

  exports.Oasis = Oasis;
})(this);

