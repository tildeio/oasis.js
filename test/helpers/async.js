/*global XDomainRequest */
var xhrs = [];

function xhrDone(url, options, xhr) {
  var compareXhr = function(xhr1, xhr2) {
    var result;
    if( typeof XDomainRequest !== 'undefined' && xhr1 instanceof XDomainRequest ) {
      result =  (xhr1.contentType === xhr2.contentType) &&
                (xhr1.responseText === xhr2.responseText);
    } else {
      result =  xhr1 === xhr2;
    }
    return result;
  };

  for (var i=0; i<xhrs.length; ++i) {
    if( compareXhr(xhrs[i].xhr, xhr) ) {
      xhrs.splice(i, 1);
      break;
    }
  }
}

function watchXHR(oasis) {
  oasis.on('xhr.send', function (url, options, xhr) {
    xhrs.push({ url: url, options: options, xhr: xhr });
  });
  oasis.on('xhr.load', xhrDone);
  oasis.on('xhr.error', xhrDone);
}

QUnit.testStart(function (details) {
  xhrs = [];
});

QUnit.testTeardown(function (details) {
  var msg, xhrDetails;
  for (var i=0; i<xhrs.length; ++i) {
    xhrDetails = xhrs[i];
    msg = "xhr(" + xhrDetails.url + ") did not complete by test end";
    ok(false, msg);
  }
});

export function watchAsync(Oasis) {
  Oasis.prototype.didCreate = function() {
    watchXHR(this);
  };
}
