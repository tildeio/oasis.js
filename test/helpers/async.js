var xhrs = [];

function xhrDone(url, options, xhr) {
  for (var i=0; i<xhrs.length; ++i) {
    if (xhrs[i].xhr === xhr) {
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
