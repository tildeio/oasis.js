var a_slice = Array.prototype.slice;

function Events() {
  this.listenerArrays = {};
}

Events.prototype = {
  on: function (eventName, listener) {
    var listeners = this.listenerArrays[eventName] = this.listenerArrays[eventName] || [];

    listeners.push(listener);
  },

  off: function (eventName, listener) {
    var listeners = this.listenerArrays[eventName];
    if (!listeners) { return; }

    for (var i=0; i<listeners.length; ++i) {
      if (listeners[i] === listener) {
        listeners.splice(i, 1);
        break;
      }
    }
  },

  clear: function(eventName) {
    delete this.listenerArrays[eventName];
  },

  trigger: function(eventName) {
    var listeners = this.listenerArrays[eventName];
    if (!listeners) { return; }

    var args = a_slice.call(arguments, 1);

    for (var i=0; i<listeners.length; ++i) {
      listeners[i].apply(null, args);
    }
  }
};

export default Events;
