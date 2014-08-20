import { o_create } from "ie8Shims";

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
      return callback.apply(service, arguments);
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
}

Service.prototype = {
  /**
    This hook is called when the connection is established. When
    `initialize` is called, it is safe to register listeners and
    send data to the other side.

    The implementation of Oasis makes it impossible for messages
    to get dropped on the floor due to timing issues.

    @param {OasisPort} port the port to the other side of the connection
    @param {String} name the name of the service
  */
  initialize: function() {},


  /**
    This hooks is called when an attempt is made to connect to a capability the
    environment does not provide.
  */
  error: function() {},

  /**
    This hook is called when the connection is stopped. When
    `destroy` is called, it is safe to unregister listeners.
  */
  destroy: function() {},

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

export default Service;
