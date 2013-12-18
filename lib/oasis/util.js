import { o_create, a_filter } from "oasis/shims";

export function assert(assertion, string) {
  if (!assertion) {
    throw new Error(string);
  }
}

export function noop() { }

export function mustImplement(className, name) {
  return function() {
    throw new Error("Subclasses of " + className + " must implement " + name);
  };
}

export function extend(parent, object) {
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

export function delegate(delegateeProperty, delegatedMethod) {
  return function () {
    var delegatee = this[delegateeProperty];
    return delegatee[delegatedMethod].apply(delegatee, arguments);
  };
}

export function uniq() {
  var seen = {};
  return a_filter.call(this, function (item) {
    var _seen = !seen.hasOwnProperty(item);
    seen[item] = true;
    return _seen;
  });
}

export function reverseMerge(a, b) {
  for (var prop in b) {
    if (!b.hasOwnProperty(prop)) { continue; }

    if (! (prop in a)) {
      a[prop] = b[prop];
    }
  }

  return a;
}
