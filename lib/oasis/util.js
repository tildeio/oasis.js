import { o_create } from "oasis/shims";

function assert(assertion, string) {
  if (!assertion) {
    throw new Error(string);
  }
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
  setTimeout( function () {
    throw error;
  }, 1);
  // also throw an error sync. to cascade promise failure
  throw error;
}

export { assert, extend, mustImplement, rsvpErrorHandler };
