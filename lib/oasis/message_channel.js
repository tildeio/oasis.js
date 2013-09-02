import RSVP from "rsvp";
import { extend, mustImplement } from "oasis/util";

/**
  OasisPort is an interface that adapters can use to implement ports.
  Ports are passed into the `initialize` method of services and consumers,
  and are available as `this.port` on services and consumers.

  Ports are the low-level API that can be used to communicate with the
  other side of a connection. In general, you will probably want to use
  the `events` and `requests` objects inside your service or consumer
  rather than manually listen for events and requests.

  @constructor
  @param {OasisPort} oasis
  @param {OasisPort} port
*/
export function OasisPort(oasis, port) {}


function getRequestId(oasis) {
  return oasis.oasisId + '-' + oasis.requestId++;
}

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
    @private

    Adapters should implement this to stop receiving messages from the
    other side of the connection.
  */
  close: mustImplement('OasisPort', 'close'),

  /**
    This method sends a request to the other side of the connection.

    @param {String} requestName the name of the request
    @return {Promise} a promise that will be resolved with the value
      provided by the other side of the connection, or rejected if the other
      side indicates retrieving the value resulted in an error. The fulfillment
      value must be structured data.
  */
  request: function(eventName) {
    var oasis = this.oasis;
    var port = this;
    var args = [].slice.call(arguments, 1);

    return new RSVP.Promise(function (resolve, reject) {
      var requestId = getRequestId(oasis);

      var clearObservers = function () {
        port.off('@response:' + eventName, observer);
        port.off('@errorResponse:' + eventName, errorObserver);
      };

      var observer = function(event) {
        if (event.requestId === requestId) {
          clearObservers();
          resolve(event.data);
        }
      };

      var errorObserver = function (event) {
        if (event.requestId === requestId) {
          clearObservers();
          reject(event.data);
        }
      };

      port.on('@response:' + eventName, observer, port);
      port.on('@errorResponse:' + eventName, errorObserver, port);
      port.send('@request:' + eventName, { requestId: requestId, args: args });
    });
  },

  /**
    This method registers a callback to be called when a request is made
    by the other side of the connection.

    The callback will be called with any arguments passed in the request.  It
    may either return a value directly, or return a promise if the value must be
    retrieved asynchronously.

    Examples:

      // This completes the request immediately.
      service.onRequest('name', function () {
        return 'David';
      });


      // This completely the request asynchronously.
      service.onRequest('name', function () {
        return new Oasis.RSVP.Promise(function (resolve, reject) {
          setTimeout( function() {
            resolve('David');
          }, 200);
        });
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
          getResponse = new RSVP.Promise(function (resolve, reject) {
            var value = callback.apply(binding, data.args);
            if (undefined !== value) {
              resolve(value);
            } else {
              reject("@request:" + eventName + " [" + data.requestId + "] did not return a value.  If you want to return a literal `undefined` return `RSVP.resolve(undefined)`");
            }
          });

      getResponse.then(function (value) {
        self.send('@response:' + eventName, {
          requestId: requestId,
          data: value
        });
      }, function (error) {
        var value = error;
        if (error instanceof Error) {
          value = {
            message: error.message,
            stack: error.stack
          };
        }
        self.send('@errorResponse:' + eventName, {
          requestId: requestId,
          data: value
        });
      });
    });
  }
};


function OasisMessageChannel(oasis) {}

OasisMessageChannel.prototype = {
  start: mustImplement('OasisMessageChannel', 'start')
};


export var PostMessageMessageChannel = extend(OasisMessageChannel, {
  initialize: function(oasis) {
    this.channel = new MessageChannel();
    this.port1 = new PostMessagePort(oasis, this.channel.port1);
    this.port2 = new PostMessagePort(oasis, this.channel.port2);
  },

  start: function() {
    this.port1.start();
    this.port2.start();
  },

  destroy: function() {
    this.port1.close();
    this.port2.close();
    delete this.port1;
    delete this.port2;
    delete this.channel;
  }
});

export var PostMessagePort = extend(OasisPort, {
  initialize: function(oasis, port) {
    this.oasis = oasis;
    this.port = port;
    this._callbacks = [];
  },

  on: function(eventName, callback, binding) {
    var oasis = this.oasis;

    function wrappedCallback(event) {
      if (event.data.type === eventName) {
        oasis.configuration.eventCallback(function () {
          return callback.call(binding, event.data.data);
        });
      }
    }

    this._callbacks.push([callback, wrappedCallback]);
    this.port.addEventListener('message', wrappedCallback);
  },

  all: function(callback, binding) {
    var oasis = this.oasis;

    function wrappedCallback(event) {
      oasis.configuration.eventCallback(function () {
        callback.call(binding, event.data.type, event.data.data);
      });
    }

    this.port.addEventListener('message', wrappedCallback);
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
  },

  close: function() {
    var foundCallback;

    for (var i=0, l=this._callbacks.length; i<l; i++) {
      foundCallback = this._callbacks[i];
      this.port.removeEventListener('message', foundCallback[1]);
    }
    this._callbacks = [];

    this.port.close();
  }
});
