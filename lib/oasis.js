import RSVP from "rsvp";
import logger from "oasis/logger";
import Version from "oasis/version";
import { assert, delegate } from "oasis/util";
import OasisConfiguration from "oasis/config";
import Sandbox from "oasis/sandbox";
import autoInitializeSandbox from "oasis/sandbox_init";
import { xhr } from "oasis/xhr";
import Events from "oasis/events";

import Service from "oasis/service";
import { connect, connectCapabilities, portFor } from "oasis/connect";

import iframeAdapter from "oasis/iframe_adapter";
import webworkerAdapter from "oasis/webworker_adapter";

function Oasis() {
  // Data structures used by Oasis when creating sandboxes
  this.packages = {};
  this.requestId = 0;
  this.oasisId = 'oasis' + (+new Date());

  this.consumers = {};
  this.services = [];

  // Data structures used when connecting to a parent sandbox
  this.ports = {};
  this.handlers = {};

  this.receivedPorts = false;

  this.configuration = new OasisConfiguration();
  this.events = new Events();

  this.didCreate();
}

Oasis.Version = Version;
Oasis.Service = Oasis.Consumer = Service;
Oasis.RSVP = RSVP;
Oasis.adapters = {
  iframe: iframeAdapter,
  webworker: webworkerAdapter
};

Oasis.prototype = {
  logger: logger,
  log: function () {
    this.logger.log.apply(this.logger, arguments);
  },

  on: delegate('events', 'on'),
  off: delegate('events', 'off'),
  trigger: delegate('events', 'trigger'),

  didCreate: function() {},

  xhr: xhr,

  /**
    This is the entry point that allows the containing environment to create a
    child sandbox.

    Options:

    * `capabilities`: an array of registered services
    * `url`: a registered URL to a JavaScript file that will initialize the
      sandbox in the sandboxed environment
    * `adapter`: a reference to an adapter that will handle the lifecycle
      of the sandbox. Right now, there are iframe and web worker adapters.

    @param {Object} options
  */
  createSandbox: function (options) {
    return new Sandbox(this, options);
  },

  /**
    This registers a sandbox type inside of the containing environment so that
    it can be referenced by URL in `createSandbox`.

    Options:

    * `capabilities`: An array of service names that will be supplied when calling
      `createSandbox`
    * `url`: The URL of the JavaScript file that contains the sandbox code

    @param {Object} options
  */
  register: function (options) {
    assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

    this.packages[options.url] = options;
  },

  configure: function(name, value) { this.configuration[name] = value; },
  autoInitializeSandbox: autoInitializeSandbox,

  connect: connect,
  connectCapabilities: connectCapabilities,
  portFor: portFor
};


export default Oasis;
