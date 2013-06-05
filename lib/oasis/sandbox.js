import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { assert } from "oasis/util";

import { OasisPort } from "oasis/message_channel";
import "oasis/state" as OasisState;
import "oasis/iframe_adapter" as iframeAdapter;

var OasisSandbox = function(options) {
  this.connections = {};
  this.wiretaps = [];

  // Generic capabilities code
  var pkg = OasisState.packages[options.url];

  var capabilities = options.capabilities;
  if (!capabilities) {
    assert(pkg, "You are trying to create a sandbox from an unregistered URL without providing capabilities. Please use Oasis.register to register your package or pass a list of capabilities to createSandbox.");
    capabilities = pkg.capabilities;
  }

  pkg = pkg || {};

  this.dependencies = options.dependencies || pkg.dependencies;

  var adapter = this.adapter = options.adapter || iframeAdapter;

  this.capabilities = capabilities;
  this.envPortDefereds = {};
  this.sandboxPortDefereds = {};
  this.channels = {};
  this.options = options;

  this.promise = adapter.initializeSandbox(this);

  this.capabilities.forEach(function(capability) {
    this.envPortDefereds[capability] = RSVP.defer();
    this.sandboxPortDefereds[capability] = RSVP.defer();
  }, this);

  this.createChannels();
  this.connectPorts();
};

OasisSandbox.prototype = {
  wiretap: function(callback) {
    this.wiretaps.push(callback);
  },

  connect: function(capability) {
    var portPromise = this.envPortDefereds[capability].promise;

    assert(portPromise, "Connect was called on '" + capability + "' but no such capability was registered.");

    return portPromise;
  },

  createChannels: function () {
    this.capabilities.forEach(function (capability) {
      var sandbox = this,
          services = this.options.services || {},
          channels = this.channels;

      Logger.log("Will create port for '" + capability + "'");
      sandbox.promise.then(function (sandbox) {
        var service = services[capability],
            channel, port;

        // If an existing port is provided, just
        // pass it along to the new sandbox.

        // TODO: This should probably be an OasisPort if possible
        if (service instanceof OasisPort) {
          port = this.adapter.proxyPort(this, service);
        } else {
          channel = channels[capability] = this.adapter.createChannel();

          var environmentPort = this.adapter.environmentPort(this, channel),
              sandboxPort = this.adapter.sandboxPort(this, channel);

          Logger.log("Wiretapping '" + capability + "'");

          environmentPort.all(function(eventName, data) {
            this.wiretaps.forEach(function(wiretap) {
              wiretap(capability, {
                type: eventName,
                data: data,
                direction: 'received'
              });
            });
          }, this);

          this.wiretaps.forEach(function(wiretap) {
            var originalSend = environmentPort.send;

            environmentPort.send = function(eventName, data) {
              wiretap(capability, {
                type: eventName,
                data: data,
                direction: 'sent'
              });

              originalSend.apply(environmentPort, arguments);
            };
          });

          if (service) {
            Logger.log("Creating service for '" + capability + "'");
            /*jshint newcap:false*/
            // Generic
            service = new service(environmentPort, this);
            service.initialize(environmentPort, capability);
          }

          // Law of Demeter violation
          port = sandboxPort;

          this.envPortDefereds[capability].resolve(environmentPort);
        }

        Logger.log("Port created for '" + capability + "'");
        this.sandboxPortDefereds[capability].resolve(port);
      }.bind(sandbox));
    }, this);
  },

  connectPorts: function () {
    var allSandboxPortPromises = this.capabilities.reduce(function (accumulator, capability) {
      return accumulator.concat(this.sandboxPortDefereds[capability].promise);
    }.bind(this), []);

    RSVP.all(allSandboxPortPromises).then(function (ports) {
      Logger.log("All " + ports.length + " ports created.  Transferring them.");
      this.adapter.connectPorts(this, ports);
    }.bind(this));
  },

  start: function(options) {
    this.adapter.startSandbox(this, options);
  },

  terminate: function() {
    this.adapter.terminateSandbox(this);
  }
};

export = OasisSandbox;
