define("oasis",
  ["oasis/util", "oasis/message_channel", "oasis/ports", "oasis/connect", "rsvp", "oasis/logger", "oasis/state", "oasis/config", "oasis/sandbox", "oasis/sandbox_init", "oasis/service", "oasis/iframe_adapter", "oasis/webworker_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, RSVP, Logger, State, configuration, Sandbox, initializeSandbox, Service, iframeAdapter, webworkerAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var verifySandbox = __dependency1__.verifySandbox;
    var OasisPort = __dependency2__.OasisPort;
    var PostMessagePort = __dependency2__.PostMessagePort;
    var handlers = __dependency3__.handlers;
    var ports = __dependency3__.ports;
    var registerHandler = __dependency4__.registerHandler;
    var connect = __dependency4__.connect;
    var portFor = __dependency4__.portFor;



    var Oasis = {};

    //Logger.enable();

    //verifySandbox();

    Oasis.adapters = {
      iframe: iframeAdapter,
      webworker: webworkerAdapter
    };


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
    Oasis.createSandbox = function(options) {
      return new Sandbox(options);
    };

    Oasis.Service = Oasis.Consumer = Service;

    var packages = State.packages;
    Oasis.reset = function() {
      State.reset();
      packages = State.packages;
      Oasis.consumers = State.consumers;
    };
    Oasis.reset();

    Oasis.config = configuration;


    /**
      This registers a sandbox type inside of the containing environment so that
      it can be referenced by URL in `createSandbox`.

      Options:

      * `capabilities`: An array of service names that will be supplied when calling
        `createSandbox`
      * `url`: The URL of the JavaScript file that contains the sandbox code

      @param {Object} options
    */
    Oasis.register = function(options) {
      assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

      packages[options.url] = options;
    };

    Oasis.registerHandler = registerHandler;
    Oasis.connect = connect;
    Oasis.portFor = portFor;

    // initializeSandbox will detect whether we are in a sandbox that needs
    // initialization or not.
    initializeSandbox();


    Oasis.RSVP = RSVP;

    return Oasis;
  });define("oasis/base_adapter",
  ["oasis/util", "oasis/shims", "oasis/ports", "oasis/message_channel", "oasis/logger", "oasis/config"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, Logger, configuration) {
    "use strict";
    var mustImplement = __dependency1__.mustImplement;
    var a_forEach = __dependency2__.a_forEach;
    var addEventListener = __dependency2__.addEventListener;
    var removeEventListener = __dependency2__.removeEventListener;
    var handlers = __dependency3__.handlers;
    var PostMessagePort = __dependency4__.PostMessagePort;
    var PostMessageMessageChannel = __dependency4__.PostMessageMessageChannel;


    function getBase () {
      var link = document.createElement("a");
      link.href = "!";
      var base = link.href.slice(0, -1);

      return base;
    }

    function BaseAdapter() {
    }

    BaseAdapter.prototype = {
      loadScripts: mustImplement('BaseAdapter', 'loadScripts'),

      oasisURL: function(sandbox) {
        return sandbox.options.oasisURL || configuration.oasisURL || 'oasis.js.html';
      },

      createChannel: function(sandbox) {
        var channel = new PostMessageMessageChannel();
        channel.port1.start();
        return channel;
      },

      environmentPort: function(sandbox, channel) {
        return channel.port1;
      },

      sandboxPort: function(sandbox, channel) {
        return channel.port2;
      },

      proxyPort: function(sandbox, port) {
        return port;
      },

      connectSandbox: function (receiver, ports) {
        var adapter = this;

        Logger.log("Listening for initialization message");

        function initializeOasisSandbox(event) {
          if (!event.data.isOasisInitialization) { return; }

          Logger.log("Sandbox initializing.");

          configuration.oasisURL = event.data.oasisURL;

          removeEventListener(receiver, 'message', initializeOasisSandbox);
          adapter.loadScripts(event.data.base, event.data.scriptURLs);

          var capabilities = event.data.capabilities, eventPorts = event.ports;

          a_forEach.call(capabilities, function(capability, i) {
            var handler = handlers[capability],
                port = new PostMessagePort(eventPorts[i]);

            if (handler) {
              Logger.log("Invoking handler for '" + capability + "'");

              handler.setupCapability(port);
              port.start();
            }

            ports[capability] = port;
          });
        }
        addEventListener(receiver, 'message', initializeOasisSandbox);
      },

      createInitializationMessage: function (sandbox) {
        var sandboxURL = sandbox.options.url,
            scriptURLs = [sandboxURL].concat(sandbox.dependencies || []);

        return {
          isOasisInitialization: true,
          capabilities: sandbox.capabilities,
          base: getBase(),
          scriptURLs: scriptURLs,
          oasisURL: this.oasisURL(sandbox)
        };
      }
    }

    return BaseAdapter;
  });define("oasis/config",
  [],
  function() {
    "use strict";
    /**
      Stores Oasis configuration.  Options include:

      `oasisURL` - the default URL to use for sandboxes.
    */
    var configuration = {
    };

    return configuration;
  });define("oasis/connect",
  ["oasis/util", "oasis/ports", "rsvp", "oasis/logger", "oasis/state", "exports"],
  function(__dependency1__, __dependency2__, RSVP, Logger, State, __exports__) {
    "use strict";
    var assert = __dependency1__.assert;
    var rsvpErrorHandler = __dependency1__.rsvpErrorHandler;
    var handlers = __dependency2__.handlers;
    var ports = __dependency2__.ports;


    function registerHandler(capability, options) {
      var port = ports[capability];

      if (port) {
        Logger.log("Found port, setting up '" + capability + "'");
        options.setupCapability(port);

        if (options.promise) {
          options.promise.then(function() {
            port.start();
          }).then(null, rsvpErrorHandler);
        } else {
          port.start();
        }
      } else {
        Logger.log("No port found, saving handler for '" + capability + "'");
        handlers[capability] = options;
      }
    };

    /**
      This is the main entry point that allows sandboxes to connect back
      to their containing environment.

      It should be called once for each service provided by the containing
     environment that it wants to connect to.

      @param {String} serviceName the name of the service to connect to
      @param {Function?} callback the callback to trigger once the other
        side of the connection is available
      @return {Promise} a promise that will be resolved once the other
        side of the connection is available. You can use this instead
        of the callback.
    */
    function connect(capability, callback) {
      function setupCapability(Consumer, name) {
        return function(port) {
          var consumer = new Consumer(port);
          State.consumers[name] = consumer;
          consumer.initialize(port, name);
          port.start();
        };
      }

      if (typeof capability === 'object') {
        var consumers = capability.consumers;

        for (var prop in consumers) {
          registerHandler(prop, {
            setupCapability: setupCapability(consumers[prop], prop)
          });
        }
      } else if (callback) {
        Logger.log("Connecting to '" + capability + "' with callback.");

        registerHandler(capability, {
          setupCapability: function(port) {
            callback(port);
          }
        });
      } else {
        Logger.log("Connecting to '" + capability + "' with promise.");

        var defered = RSVP.defer();
        registerHandler(capability, {
          promise: defered.promise,
          setupCapability: function(port) {
            defered.resolve(port);
          }
        });
        return defered.promise;
      }
    };

    function portFor(capability) {
      var port = ports[capability];
      assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
      return port;
    };

    __exports__.registerHandler = registerHandler;
    __exports__.connect = connect;
    __exports__.portFor = portFor;
  });define("oasis/iframe_adapter",
  ["oasis/util", "oasis/shims", "oasis/ports", "rsvp", "oasis/logger", "oasis/base_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var extend = __dependency1__.extend;
    var addEventListener = __dependency2__.addEventListener;
    var removeEventListener = __dependency2__.removeEventListener;
    var a_map = __dependency2__.a_map;
    var handlers = __dependency3__.handlers;



    var IframeAdapter = extend(BaseAdapter, {
      initializeSandbox: function(sandbox) {
        var options = sandbox.options,
            iframe = document.createElement('iframe'),
            oasisURL = this.oasisURL(sandbox),
            iframeLoaded = false;

        iframe.name = sandbox.options.url;
        iframe.sandbox = 'allow-same-origin allow-scripts';
        iframe.seamless = true;
        iframe.src = 'about:blank';

        // rendering-specific code
        if (options.width) {
          iframe.width = options.width;
        } else if (options.height) {
          iframe.height = options.height;
        }

        sandbox.el = iframe;

        return new RSVP.Promise(function (resolve, reject) {
          sandbox.iframeLoadHandler = function () {
            if (!iframeLoaded) {
              iframeLoaded = true;
              Logger.log("iframe loading oasis");
              iframe.contentWindow.location.href = oasisURL;
            } else {
              Logger.log("iframe sandbox initialized");
              resolve(sandbox);
            }
          };
          addEventListener(iframe, 'load', sandbox.iframeLoadHandler);
        });
      },

      loadScripts: function (base, scriptURLs) {
        var head = document.head || document.documentElement.getElementsByTagName('head')[0],
            scriptElement;

        var baseElement = document.createElement('base');
        baseElement.href = base;
        head.insertBefore(baseElement, head.childNodes[0] || null);

        for (var i = 0; i < scriptURLs.length; ++i ) {
          scriptElement = document.createElement('script');
          scriptElement.src = scriptURLs[i];
          scriptElement.async = false;
          head.appendChild(scriptElement);
        }
      },

      startSandbox: function(sandbox) {
        var head = document.head || document.documentElement.getElementsByTagName('head')[0];
        head.appendChild(sandbox.el);
      },

      terminateSandbox: function(sandbox) {
        var el = sandbox.el;

        removeEventListener(el, 'load', sandbox.iframeLoadHandler);
        el.terminated = true;

        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = a_map.call(ports, function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox),
            el = sandbox.el;

        if (el.terminated) { return; }
        Window.postMessage(sandbox.el.contentWindow, message, '*', rawPorts);
      },

      connectSandbox: function(ports) {
        return BaseAdapter.prototype.connectSandbox.call(this, window, ports);
      }
    });

    var iframeAdapter = new IframeAdapter;

    return iframeAdapter;
  });define("oasis/logger",
  [],
  function() {
    "use strict";
    function Logger() {
      this.enabled = false;
    }

    Logger.prototype = {
      enable: function () {
        this.enabled = true;
      },

      log: function () {
        if (logger.enabled) {
          if (typeof console !== 'undefined' && typeof console.log === 'function') {
            console.log.apply(console, arguments);
          } else if (typeof console !== 'undefined' && typeof console.log === 'object') {
            // Log in IE
            try {
              switch (arguments.length) {
                case 1:
                  console.log(arguments[0]);
                  break;
                case 2:
                  console.log(arguments[0], arguments[1]);
                  break;
                default:
                  console.log(arguments[0], arguments[1], arguments[2]);
              }
            } catch(e) {}
          }
        }
      }
    }

    var logger = new Logger;

    return logger;
  });define("oasis/message_channel",
  ["oasis/util", "rsvp", "oasis/state", "exports"],
  function(__dependency1__, RSVP, OasisState, __exports__) {
    "use strict";
    var extend = __dependency1__.extend;
    var mustImplement = __dependency1__.mustImplement;
    var rsvpErrorHandler = __dependency1__.rsvpErrorHandler;

    /**
      OasisPort is an interface that adapters can use to implement ports.
      Ports are passed into the `initialize` method of services and consumers,
      and are available as `this.port` on services and consumers.

      Ports are the low-level API that can be used to communicate with the
      other side of a connection. In general, you will probably want to use
      the `events` and `requests` objects inside your service or consumer
      rather than manually listen for events and requests.

      @constructor
      @param {OasisPort} port
    */
    function OasisPort(port) {}


    function getRequestId() {
      return OasisState.oasisId + '-' + OasisState.requestId++;
    };

    OasisPort.prototype = {
      /**
        This allows you to register an event handler for a particular event
        name.

        @param {String} eventName the name of the event
        @param {Function} callback the callback to call when the event occurs
        @param {any?} binding an optional value of `this` inside of the callback
      */
      on: mustImplement('OasisPort', 'on'),

      /**
        Allows you to register an event handler that is called for all events
        that are sent to the port.
      */
      all: mustImplement('OasisPort', 'all'),

      /**
        This allows you to unregister an event handler for an event name
        and callback. You should not pass in the optional binding.

        @param {String} eventName the name of the event
        @param {Function} callback a reference to the callback that was
          passed into `.on`.
      */
      off: mustImplement('OasisPort', 'off'),

      /**
        This method sends an event to the other side of the connection.

        @param {String} eventName the name of the event
        @param {Structured?} data optional data to pass along with the event
      */
      send: mustImplement('OasisPort', 'send'),

      /**
        @private

        Adapters should implement this to start receiving messages from the
        other side of the connection.

        It is up to the adapter to make sure that no messages are dropped if
        they are sent before `start` is called.
      */
      start: mustImplement('OasisPort', 'start'),

      /**
        This method sends a request to the other side of the connection.

        @param {String} requestName the name of the request
        @return {Promise} a promise that will be resolved with the value
          provided by the other side of the connection. The fulfillment value
          must be structured data.
      */
      request: function(eventName) {
        var port = this;
        var args = [].slice.call(arguments, 1);

        return new RSVP.Promise(function (resolve, reject) {
          var requestId = getRequestId();

          var observer = function(event) {
            if (event.requestId === requestId) {
              port.off('@response:' + eventName, observer);
              resolve(event.data);
            }
          };

          port.on('@response:' + eventName, observer, port);
          port.send('@request:' + eventName, { requestId: requestId, args: args });
        });
      },

      /**
        This method registers a callback to be called when a request is made
        by the other side of the connection.

        The callback will be called with a promise, that the callback should fulfill.

        Examples

          service.onRequest('name', function (promise) {
            promise.resolve('David');
          });

        @param {String} requestName the name of the request
        @param {Function} callback the callback to be called when a request
          is made.
        @param {any?} binding the value of `this` in the callback
      */
      onRequest: function(eventName, callback, binding) {
        var self = this;

        this.on('@request:' + eventName, function(data) {
          var requestId = data.requestId,
              args = data.args,
              defered = RSVP.defer();

          defered.promise.then(function (data) {
            self.send('@response:' + eventName, {
              requestId: requestId,
              data: data
            });
          }).then(null, rsvpErrorHandler);

          args.unshift(defered);
          callback.apply(binding, args);
        });
      }
    };


    function OasisMessageChannel() {}

    OasisMessageChannel.prototype = {
      start: mustImplement('OasisMessageChannel', 'start')
    };


    var PostMessageMessageChannel = extend(OasisMessageChannel, {
      initialize: function() {
        this.channel = new MessageChannel();
        this.port1 = new PostMessagePort(this.channel.port1);
        this.port2 = new PostMessagePort(this.channel.port2);
      },

      start: function() {
        this.port1.start();
        this.port2.start();
      }
    });

    var PostMessagePort = extend(OasisPort, {
      initialize: function(port) {
        this.port = port;
        this._callbacks = [];
      },

      on: function(eventName, callback, binding) {
        function wrappedCallback(event) {
          if (event.data.type === eventName) {
            callback.call(binding, event.data.data);
          }
        }

        this._callbacks.push([callback, wrappedCallback]);
        this.port.addEventListener('message', wrappedCallback);
      },

      all: function(callback, binding) {
        this.port.addEventListener('message', function(event) {
          callback.call(binding, event.data.type, event.data.data);
        });
      },

      off: function(eventName, callback) {
        var foundCallback;

        for (var i=0, l=this._callbacks.length; i<l; i++) {
          foundCallback = this._callbacks[i];
          if (foundCallback[0] === callback) {
            this.port.removeEventListener('message', foundCallback[1]);
          }
        }
      },

      send: function(eventName, data) {
        this.port.postMessage({
          type: eventName,
          data: data
        });
      },

      start: function() {
        this.port.start();
      }
    });

    __exports__.OasisPort = OasisPort;
    __exports__.PostMessageMessageChannel = PostMessageMessageChannel;
    __exports__.PostMessagePort = PostMessagePort;
  });define("oasis/ports",
  ["exports"],
  function(__exports__) {
    "use strict";
    var ports = {};
    var handlers = {};

    __exports__.handlers = handlers;
    __exports__.ports = ports;
  });define("oasis/sandbox",
  ["oasis/util", "oasis/shims", "oasis/message_channel", "rsvp", "oasis/logger", "oasis/state", "oasis/config", "oasis/iframe_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, RSVP, Logger, State, configuration, iframeAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var rsvpErrorHandler = __dependency1__.rsvpErrorHandler;
    var a_forEach = __dependency2__.a_forEach;
    var a_reduce = __dependency2__.a_reduce;
    var OasisPort = __dependency3__.OasisPort;


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

      var adapter = this.adapter = options.adapter || iframeAdapter;

      this.capabilities = capabilities;
      this.envPortDefereds = {};
      this.sandboxPortDefereds = {};
      this.channels = {};
      this.options = options;

      this.promise = adapter.initializeSandbox(this);

      a_forEach.call(this.capabilities, function(capability) {
        this.envPortDefereds[capability] = RSVP.defer();
        this.sandboxPortDefereds[capability] = RSVP.defer();
      }, this);

      var sandbox = this;
      this.promise.then(function () {
        sandbox.createChannels();
        sandbox.connectPorts();
      }).then(null, rsvpErrorHandler);
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
        var sandbox = this,
            services = this.options.services || {},
            channels = this.channels;
        a_forEach.call(this.capabilities, function (capability) {

          Logger.log("Will create port for '" + capability + "'");
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
            }

            // Law of Demeter violation
            port = sandboxPort;

            this.envPortDefereds[capability].resolve(environmentPort);
          }

          Logger.log("Port created for '" + capability + "'");
          this.sandboxPortDefereds[capability].resolve(port);
        }, this);
      },

      connectPorts: function () {
        var sandbox = this;

        var allSandboxPortPromises = a_reduce.call(this.capabilities, function (accumulator, capability) {
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
        this.adapter.terminateSandbox(this);
      }
    };

    return OasisSandbox;
  });define("oasis/sandbox_init",
  ["oasis/ports", "oasis/iframe_adapter", "oasis/webworker_adapter"],
  function(__dependency1__, iframeAdapter, webworkerAdapter) {
    "use strict";
    var ports = __dependency1__.ports;


    function initializeSandbox () {
      if (typeof window !== 'undefined') {
        iframeAdapter.connectSandbox(ports);
      } else {
        webworkerAdapter.connectSandbox(ports);
      }
    };

    return initializeSandbox;
  });define("oasis/service",
  ["oasis/shims"],
  function(__dependency1__) {
    "use strict";
    var o_create = __dependency1__.o_create;

    /**
      This is a base class that services and consumers can subclass to easily
      implement a number of events and requests at once.

      Example:

          var MetadataService = Oasis.Service.extend({
            initialize: function() {
              this.send('data', this.sandbox.data);
            },

            events: {
              changed: function(data) {
                this.sandbox.data = data;
              }
            },

            requests: {
              valueForProperty: function(name, promise) {
                promise.resolve(this.sandbox.data[name]);
              }
            }
          });

      In the above example, the metadata service implements the Service
      API using `initialize`, `events` and `requests`.

      Both services (implemented in the containing environment) and
      consumers (implemented in the sandbox) use the same API for
      registering events and requests.

      In the containing environment, a service is registered in the
      `createSandbox` method. In the sandbox, a consumer is registered
      using `Oasis.connect`.

      ### `initialize`

      Oasis calls the `initialize` method once the other side of the
      connection has initialized the connection.

      This method is useful to pass initial data back to the other side
      of the connection. You can also set up events or requests manually,
      but you will usually want to use the `events` and `requests` sections
      for events and requests.

      ### `events`

      The `events` object is a list of event names and associated callbacks.
      Oasis will automatically set up listeners for each named event, and
      trigger the callback with the data provided by the other side of the
      connection.

      ### `requests`

      The `requests` object is a list of request names and associated
      callbacks. Oasis will automatically set up listeners for requests
      made by the other side of the connection, and trigger the callback
      with the request information as well as a promise that you should
      use to fulfill the request.

      Once you have the information requested, you should call
      `promise.resolve` with the response data.

      @constructor
      @param {OasisPort} port
      @param {OasisSandbox} sandbox in the containing environment, the
        OasisSandbox that this service is connected to.
    */
    function Service (port, sandbox) {
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

    Service.prototype = {
      /**
        This hook is called when the connection is established. When
        `initialized` is called, it is safe to register listeners and
        send data to the other side.

        The implementation of Oasis makes it impossible for messages
        to get dropped on the floor due to timing issues.

        @param {OasisPort} port the port to the other side of the connection
        @param {String} name the name of the service
      */
      initialize: function() {},

      /**
        This method can be used to send events to the other side of the
        connection.

        @param {String} eventName the name of the event to send to the
          other side of the connection
        @param {Structured} data an additional piece of data to include
          as the data for the event.
      */
      send: function() {
        return this.port.send.apply(this.port, arguments);
      },

      /**
        This method can be used to request data from the other side of
        the connection.

        @param {String} requestName the name of the request to send to
          the other side of the connection.
        @return {Promise} a promise that will be resolved by the other
          side of the connection. Use `.then` to wait for the resolution.
      */
      request: function() {
        return this.port.request.apply(this.port, arguments);
      }
    };

    Service.extend = function extend(object) {
      var superConstructor = this;

      function Service() {
        if (Service.prototype.init) { Service.prototype.init.call(this); }
        superConstructor.apply(this, arguments);
      }

      Service.extend = extend;

      var ServiceProto = Service.prototype = o_create(this.prototype);

      for (var prop in object) {
        ServiceProto[prop] = object[prop];
      }

      return Service;
    };

    return Service;
  });define("oasis/shims",
  ["exports"],
  function(__exports__) {
    "use strict";
    var K = function() {};

    function o_create(obj, props) {
      K.prototype = obj;
      obj = new K();
      if (props) {
        K.prototype = obj;
        for (var prop in props) {
          K.prototype[prop] = props[prop].value;
        }
        obj = new K();
      }
      K.prototype = null;

      return obj;
    };

    // If it turns out we need a better polyfill we can grab mozilla's at: 
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.removeEventListener?redirectlocale=en-US&redirectslug=DOM%2FEventTarget.removeEventListener#Polyfill_to_support_older_browsers
    function addEventListener(receiver, eventName, fn) {
      if (receiver.addEventListener) {
        return receiver.addEventListener(eventName, fn);
      } else if (receiver.attachEvent) {
        return receiver.attachEvent('on' + eventName, fn);
      }
    }

    function removeEventListener(receiver, eventName, fn) {
      if (receiver.removeEventListener) {
        return receiver.removeEventListener(eventName, fn);
      } else if (receiver.removeEvent) {
        return receiver.removeEvent('on' + eventName, fn);
      }
    }

    function isNativeFunc(func) {
      // This should probably work in all browsers likely to have ES5 array methods
      return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
    }

    var a_forEach = isNativeFunc(Array.prototype.forEach) ? Array.prototype.forEach : function(fun /*, thisp */) {
      //"use strict";

      if (this === void 0 || this === null) {
        throw new TypeError();
      }

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function") {
        throw new TypeError();
      }

      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          fun.call(thisp, t[i], i, t);
        }
      }
    };

    var a_reduce = isNativeFunc(Array.prototype.reduce) ? Array.prototype.reduce : function(callback, opt_initialValue){
      'use strict';
      if (null === this || 'undefined' === typeof this) {
        // At the moment all modern browsers, that support strict mode, have
        // native implementation of Array.prototype.reduce. For instance, IE8
        // does not support strict mode, so this check is actually useless.
        throw new TypeError(
            'Array.prototype.reduce called on null or undefined');
      }
      if ('function' !== typeof callback) {
        throw new TypeError(callback + ' is not a function');
      }
      var index = 0, length = this.length >>> 0, value, isValueSet = false;
      if (1 < arguments.length) {
        value = opt_initialValue;
        isValueSet = true;
      }
      for ( ; length > index; ++index) {
        if (!this.hasOwnProperty(index)) continue;
        if (isValueSet) {
          value = callback(value, this[index], index, this);
        } else {
          value = this[index];
          isValueSet = true;
        }
      }
      if (!isValueSet) {
        throw new TypeError('Reduce of empty array with no initial value');
      }
      return value;
    };

    var a_map = isNativeFunc(Array.prototype.map) ? Array.prototype.map : function(callback, thisArg) {

        var T, A, k;

        if (this == null) {
          throw new TypeError(" this is null or not defined");
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
          throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (thisArg) {
          T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len) where Array is
        // the standard built-in constructor with that name and len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while(k < len) {

          var kValue, mappedValue;

          // a. Let Pk be ToString(k).
          //   This is implicit for LHS operands of the in operator
          // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
          //   This step can be combined with c
          // c. If kPresent is true, then
          if (k in O) {

            // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
            kValue = O[ k ];

            // ii. Let mappedValue be the result of calling the Call internal method of callback
            // with T as the this value and argument list containing kValue, k, and O.
            mappedValue = callback.call(T, kValue, k, O);

            // iii. Call the DefineOwnProperty internal method of A with arguments
            // Pk, Property Descriptor {Value: mappedValue, : true, Enumerable: true, Configurable: true},
            // and false.

            // In browsers that support Object.defineProperty, use the following:
            // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

            // For best browser support, use the following:
            A[ k ] = mappedValue;
          }
          // d. Increase k by 1.
          k++;
        }

        // 9. return A
        return A;
      };  

    __exports__.o_create = o_create;
    __exports__.a_forEach = a_forEach;
    __exports__.a_reduce = a_reduce;
    __exports__.a_map = a_map;
    __exports__.addEventListener = addEventListener;
    __exports__.removeEventListener = removeEventListener;
  });define("oasis/state",
  [],
  function() {
    "use strict";
    function State () {
      this.reset();
    };

    State.prototype.reset = function () {
      this.packages = {};
      this.requestId = 0;
      this.oasisId = 'oasis' + (+new Date());

      this.consumers = {};
    }

    return new State;
  });define("oasis/util",
  ["oasis/shims", "exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var o_create = __dependency1__.o_create;

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

    function mustImplement(className, name) {
      return function() {
        throw new Error("Subclasses of " + className + " must implement " + name);
      };
    }

    function extend(parent, object) {
      function OasisObject() {
        parent.apply(this, arguments);
        if (this.initialize) {
          this.initialize.apply(this, arguments);
        }
      }

      OasisObject.prototype = o_create(parent.prototype);

      for (var prop in object) {
        if (!object.hasOwnProperty(prop)) { continue; }
        OasisObject.prototype[prop] = object[prop];
      }

      return OasisObject;
    }

    function rsvpErrorHandler(error) {
      if (typeof console === 'object' && console.assert && console.error) {
        // chrome does not (yet) link the URLs in `console.assert`
        console.error(error.stack);
        console.assert(false, error.message);
      }
      // throw an error upstream for tests & browsers without `console.assert`
      setTimeout( function () { throw error; }, 1);
      // also throw an error sync. to cascade promise failure
      throw error;
    }

    __exports__.assert = assert;
    __exports__.extend = extend;
    __exports__.mustImplement = mustImplement;
    __exports__.verifySandbox = verifySandbox;
    __exports__.rsvpErrorHandler = rsvpErrorHandler;
  });define("oasis/webworker_adapter",
  ["oasis/util", "oasis/shims", "oasis/ports", "rsvp", "oasis/logger", "oasis/base_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var extend = __dependency1__.extend;
    var a_forEach = __dependency2__.a_forEach;
    var handlers = __dependency3__.handlers;



    var WebworkerAdapter = extend(BaseAdapter, {
      initializeSandbox: function(sandbox) {
        var oasisURL = this.oasisURL(sandbox);
        var worker = new Worker(oasisURL);
        sandbox.worker = worker;
        return new RSVP.Promise(function (resolve, reject) {
          setTimeout(function() {
            Logger.log("webworker sandbox initialized");
            resolve(sandbox);
          });
        });
      },

      loadScripts: function (base, scriptURLs) {
        a_forEach.call(scriptURLs, function (scriptURL) {
          importScripts(base + scriptURL);
        });
      },

      startSandbox: function(sandbox) { },

      terminateSandbox: function(sandbox) {
        sandbox.worker.terminate();
      },
  
      connectPorts: function(sandbox, ports) {
        var rawPorts = ports.map(function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox);

        Worker.postMessage(sandbox.worker, message, rawPorts);
      },

      connectSandbox: function(ports) {
        return BaseAdapter.prototype.connectSandbox.call(this, self, ports);
      }
    });

    var webworkerAdapter = new WebworkerAdapter;

    return webworkerAdapter;
  });