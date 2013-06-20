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

  OasisObject.prototype = Object.create(parent.prototype);

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
  } else {
    setTimeout( function () {
      throw error;
    }, 1);
  }
  throw error;
}

export { assert, extend, mustImplement, verifySandbox, rsvpErrorHandler };
