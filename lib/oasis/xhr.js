/*global XDomainRequest */

import RSVP from "rsvp";

function acceptsHeader(options) {
  var dataType = options.dataType;

  if (dataType && accepts[dataType]) {
    return accepts[dataType];
  }

  return accepts['*'];
}

function xhrSetRequestHeader(xhr, options) {
  xhr.setRequestHeader("Accepts", acceptsHeader(options));
}

function xhrGetLoadStatus(xhr) {
  return xhr.status;
}


function xdrPreamble(xhr) {
  // see http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e
  // see http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
  //
  // tl;dr specify all event hooks or requests will sometimes be erroneously
  // aborted in IE9.
  xhr.onprogress = noop;
  xhr.ontimeout = noop;
  xhr.timeout = 0;
}

function xdrGetLoadStatus() {
  return 200;
}

function noop() { }

var accepts = {
  "*": "*/*",
  text: "text/plain",
  html: "text/html",
  xml: "application/xml, text/xml",
  json: "application/json, text/javascript"
};

var XHR, setRequestHeader, getLoadStatus, preamble, send;

if ('withCredentials' in new XMLHttpRequest()) {
  XHR = XMLHttpRequest;
  setRequestHeader = xhrSetRequestHeader;
  getLoadStatus = xhrGetLoadStatus;
  preamble = noop;
} else if (typeof XDomainRequest !== 'undefined') {
  XHR = XDomainRequest;
  setRequestHeader = noop;
  getLoadStatus = xdrGetLoadStatus;
  preamble = xdrPreamble;
}
// else inline adapter with cross-domain cards is not going to work


export function xhr(url, options) {
  return RSVP.Promise(function(resolve, reject){
    var xhr = new XHR();
    xhr.open("get", url, true);
    setRequestHeader(xhr, options);
    preamble(xhr);

    xhr.onload = function () {
      var status = getLoadStatus(xhr);
      if (status >= 200 && status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(xhr);
      }
    };

    xhr.onerror = function () {
      reject(xhr);
    };

    xhr.send();
  });
}
