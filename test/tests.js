module("Oasis");

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

test("Assert browser satisfies minimum requirements", function() {
  var iframe = document.createElement('iframe');

  iframe.sandbox = 'allow-scripts';
  ok(iframe.getAttribute('sandbox') === 'allow-scripts', "The current version of Oasis requires Sandboxed iframes, which are not supported on your current platform. See http://caniuse.com/#feat=iframe-sandbox");

  ok(typeof MessageChannel !== 'undefined', "The current version of Oasis requires MessageChannel, which is not supported on your current platform. A near-future version of Oasis will polyfill MessageChannel using the postMessage API");
});

module("Oasis.createCard", {
  teardown: function() {
    Oasis.reset();
  }
});

test("assertion: must register package", function() {
  raises(function() {
    var iframe = Oasis.createCard({
      url: "fixtures/index.html"
    });
  }, Error, "Creating a card from an unregistered package fails");
});

test("assertion: must provide capabilities when registering a package", function() {
  raises(function() {
    Oasis.register({
      url: 'fixtures/index.html'
    });
  }, Error, "Registering a package without capabilities fails");
});

test("returns an iframe", function() {
  Oasis.register({
    url: "fixtures/index.html",
    capabilities: []
  });

  var iframe = Oasis.createCard({
    url: "fixtures/index.html"
  });

  ok(iframe instanceof window.HTMLIFrameElement, "A new iframe was returned");
});
