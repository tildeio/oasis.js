import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert, rsvpErrorHandler } from "oasis/util";
import { a_forEach, a_reduce} from "oasis/shims";

import { OasisPort } from "oasis/message_channel";
import State from "oasis/state";
import { configuration } from "oasis/config";
import iframeAdapter from "oasis/iframe_adapter";

var OasisSandbox = function(options) {
  this.connections = {};
  this.wiretaps = [];

  // Generic capabilities code
  var pkg = State.packages[options.url];

  var capabilities = options.capabilities;
  if (!capabilities) {
    assert(pkg, "You are trying to create a sandbox from an unregistered URL without providing capabilities. Please use Oasis.register to register your package or pass a list of capabilities to createSandbox.");
    capabilities = pkg.capabilities;
  }

  pkg = pkg || {};

  this.dependencies = options.dependencies || pkg.dependencies;

  this.adapter = options.adapter || iframeAdapter;
  this.type = options.type || 'js';

  this._capabilitiesToConnect = capabilities;
  this.envPortDefereds = {};
  this.sandboxPortDefereds = {};
  this.channels = {};
  this.capabilities = {};
  this.options = options;

  a_forEach.call(capabilities, function(capability) {
    this.envPortDefereds[capability] = RSVP.defer();
    this.sandboxPortDefereds[capability] = RSVP.defer();
  }, this);

  var sandbox = this;
  this.adapter.initializeSandbox(this).then(function () {
    sandbox.createChannels();
    sandbox.connectPorts();
  }).then(null, rsvpErrorHandler);
};

OasisSandbox.prototype = {
  waitForLoad: function () {
    return this._waitForLoadDeferred().promise;
  },

  wiretap: function(callback) {
    this.wiretaps.push(callback);
  },

  connect: function(capability) {
    var portPromise = this.envPortDefereds[capability].promise;

    assert(portPromise, "Connect was called on '" + capability + "' but no such capability was registered.");

    return portPromise;
  },

  createChannels: function () {
    var sandbox = this,
        services = this.options.services || {},
        channels = this.channels;
    a_forEach.call(this._capabilitiesToConnect, function (capability) {

      Logger.log("Will create port for '" + capability + "'");
      var service = services[capability],
          channel, port;

      // If an existing port is provided, just
      // pass it along to the new sandbox.

      // TODO: This should probably be an OasisPort if possible
      if (service instanceof OasisPort) {
        port = this.adapter.proxyPort(this, service);
        this.capabilities[capability] = service;
      } else {
        channel = channels[capability] = this.adapter.createChannel();

        var environmentPort = this.adapter.environmentPort(this, channel),
            sandboxPort = this.adapter.sandboxPort(this, channel);

        Logger.log("Wiretapping '" + capability + "'");

        environmentPort.all(function(eventName, data) {
          a_forEach.call(this.wiretaps, function(wiretap) {
            wiretap(capability, {
              type: eventName,
              data: data,
              direction: 'received'
            });
          });
        }, this);

        a_forEach.call(this.wiretaps, function(wiretap) {
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
          State.services.push(service);
          this.capabilities[capability] = service;
        }

        // Law of Demeter violation
        port = sandboxPort;

        this.envPortDefereds[capability].resolve(environmentPort);
      }

      Logger.log("Port created for '" + capability + "'");
      this.sandboxPortDefereds[capability].resolve(port);
    }, this);
  },

  destroyChannels: function() {
    for( var prop in this.channels ) {
      this.channels[prop].destroy();
      delete this.channels[prop];
    }
    this.channels = [];
  },

  connectPorts: function () {
    var sandbox = this;

    var allSandboxPortPromises = a_reduce.call(this._capabilitiesToConnect, function (accumulator, capability) {
      return accumulator.concat(sandbox.sandboxPortDefereds[capability].promise);
    }, []);

    RSVP.all(allSandboxPortPromises).then(function (ports) {
      Logger.log("All " + ports.length + " ports created.  Transferring them.");
      sandbox.adapter.connectPorts(sandbox, ports);
    }).then(null, rsvpErrorHandler);
  },

  start: function(options) {
    this.adapter.startSandbox(this, options);
  },

  terminate: function() {
    var channel,
        environmentPort;

    if( this.isTerminated ) { return; }
    this.isTerminated = true;

    this.adapter.terminateSandbox(this);

    this.destroyChannels();

    for( var index=0 ; index<State.services.length ; index++) {
      State.services[index].destroy();
      delete State.services[index];
    }
    State.services = [];
  },

  // Oasis internal

  _waitForLoadDeferred: function () {
    if (!this._loadDeferred) {
      // the adapter will resolve this
      this._loadDeferred = RSVP.defer();
    }

    return this._loadDeferred;
  }
};

export default OasisSandbox;
