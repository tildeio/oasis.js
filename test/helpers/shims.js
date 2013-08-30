/*jshint eqeqeq:false */

export function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
}

function isNativeFunc(func) {
  // This should probably work in all browsers likely to have ES5 array methods
  return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
}

export var a_indexOf = isNativeFunc(Array.prototype.indexOf) ? Array.prototype.indexOf : function (searchElement /*, fromIndex */ ) {
  if (this == null) {
    throw new TypeError();
  }
  var t = Object(this);
  var len = t.length >>> 0;

  if (len === 0) {
    return -1;
  }
  var n = 0;
  if (arguments.length > 1) {
    n = Number(arguments[1]);
    if (n != n) { // shortcut for verifying if it's NaN
      n = 0;
    } else if (n != 0 && n != Infinity && n != -Infinity) {
      n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
  }
  if (n >= len) {
    return -1;
  }
  var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
  for (; k < len; k++) {
    if (k in t && t[k] === searchElement) {
      return k;
    }
  }
  return -1;
};

export function _addEventListener(receiver, eventName, fn) {
  if (receiver.addEventListener) {
    return receiver.addEventListener(eventName, fn);
  } else if (receiver.attachEvent) {
    return receiver.attachEvent('on' + eventName, fn);
  }
}

var errorsHaveStacks = (function () {
  try {
    throw new Error("message");
  } catch (error) {
    return typeof error.stack === 'string';
  }
})();
