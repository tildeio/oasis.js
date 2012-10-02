(function() {
window.Oasis = window.Oasis || {};

// Extract this into its own library
var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var async;

if (MutationObserver) {
  var queue = [];

  var observer = new MutationObserver(function() {
    var toProcess = queue.slice();
    queue = [];

    toProcess.forEach(function(tuple) {
      var callback = tuple[0], binding = tuple[1];
      callback.call(binding);
    });
  });

  var element = document.createElement('div');
  observer.observe(element, { attributes: true });

  async = function(callback, binding) {
    queue.push([callback, binding]);
    element.setAttribute('drainQueue', 'drainQueue');
  };
} else {
  async = function(callback, binding) {
    setTimeout(function() {
      callback.call(binding);
    }, 1);
  };
}

Oasis.async = async;

})();

(function() {

Oasis.Event = function(type, options) {
  this.type = type;

  for (var option in options) {
    if (!options.hasOwnProperty(option)) { continue; }

    this[option] = options[option];
  }
};

var indexOf = function(callbacks, callback) {
  for (var i=0, l=callbacks.length; i<l; i++) {
    if (callbacks[i][0] === callback) { return i; }
  }

  return -1;
};

var callbacksFor = function(object) {
  var callbacks = object._cardalogCallbacks;

  if (!callbacks) {
    callbacks = object._cardalogCallbacks = {};
  }

  return callbacks;
};

Oasis.EventTarget = {
  mixin: function(object) {
    object.on = this.on;
    object.off = this.off;
    object.trigger = this.trigger;
    return object;
  },

  on: function(eventName, callback, binding) {
    var allCallbacks = callbacksFor(this), callbacks;
    binding = binding || this;

    callbacks = allCallbacks[eventName];

    if (!callbacks) {
      callbacks = allCallbacks[eventName] = [];
    }

    if (indexOf(callbacks, callback) === -1) {
      callbacks.push([callback, binding]);
    }
  },

  off: function(eventName, callback) {
    var allCallbacks = callbacksFor(this), callbacks;

    if (!callback) {
      allCallbacks[eventName] = [];
      return;
    }

    callbacks = allCallbacks[eventName];

    var index = indexOf(callbacks, callback);

    if (index !== -1) { callbacks.splice(index, 1); }
  },

  trigger: function(eventName, options) {
    var allCallbacks = callbacksFor(this),
        callbacks, callbackTuple, callback, binding, event;

    if (callbacks = allCallbacks[eventName]) {
      for (var i=0, l=callbacks.length; i<l; i++) {
        callbackTuple = callbacks[i];
        callback = callbackTuple[0];
        binding = callbackTuple[1];

        if (typeof options !== 'object') {
          options = { detail: options };
        }

        event = new Oasis.Event(eventName, options);
        callback.call(binding, event);
      }
    }
  }
};

})();

(function() {
var async = Oasis.async;

Oasis.Promise = function() {
  this.on('promise:resolved', function(event) {
    this.trigger('success', { detail: event.detail });
  }, this);

  this.on('promise:failed', function(event) {
    this.trigger('error', { detail: event.detail });
  }, this);
};

var throwException = function() {
  throw new Error("You cannot resolve this Oasis.Promise because it has already been resolved.");
};

Oasis.Promise.prototype = {
  then: function(doneCallback, failCallback) {
    var thenPromise = new Oasis.Promise();

    if (doneCallback) {
      this.on('promise:resolved', function(event) {
        var promise = doneCallback(event.detail);
        if (promise instanceof Oasis.Promise) {
          promise.then(function(value) { thenPromise.resolve(value); });
        }
      }, this);
    }

    if (failCallback) {
      this.on('promise:failed', function(event) {
        var promise = failCallback(event.detail);
        thenPromise.reject(event.detail);
      }, this);
    } else {
      this.on('promise:failed', function(event) {
        thenPromise.reject(event.detail);
      }, this);
    }

    return thenPromise;
  },

  resolve: function(value) {
    var self = this;

    async(function() {
      this.trigger('promise:resolved', { detail: value });
    }, this);

    this.resolve = throwException;
    this.reject = throwException;
  },

  reject: function(value) {
    async(function() {
      this.trigger('promise:failed', { detail: value });
    }, this);

    this.resolve = throwException;
    this.reject = throwException;
  }
};

Oasis.EventTarget.mixin(Oasis.Promise.prototype);
})();
