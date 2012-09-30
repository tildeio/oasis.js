QUnit.config.testTimeout = 1000;

var sandbox;

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

module("Oasis.createSandbox", {
  teardown: function() {
    var el = sandbox && sandbox.el;
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
    Oasis.reset();
  }
});

test("assertion: must register package", function() {
  raises(function() {
    sandbox = Oasis.createSandbox({
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

test("returns a sandbox with an iframe element", function() {
  Oasis.register({
    url: "fixtures/index.html",
    capabilities: []
  });

  sandbox = Oasis.createSandbox({
    url: "fixtures/index.html"
  });

  ok(sandbox.el instanceof window.HTMLIFrameElement, "A new iframe was returned");
});

test("service is notified about ports created for a card", function() {
  Oasis.register({
    url: "fixtures/index.html",
    capabilities: ['testData']
  });

  stop();

  var dataService = {
    sandboxLoaded: function(port, capability) {
      start();
      equal(capability, 'testData');
    }
  };

  sandbox = Oasis.createSandbox({
    url: "fixtures/index.html",
    services: {
      testData: dataService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("service - card can communicate with the environment through a port", function() {
  Oasis.register({
    url: "fixtures/assertions.html",
    capabilities: ['assertions']
  });

  stop();

  var assertionsService = {
    sandboxLoaded: function(port, capability) {
      equal(capability, 'assertions', "precond - capability is the assertions service");

      port.on('ok', function(data) {
        start();
        equal(data, 'success', "The card was able to communicate back");
      });
    }
  };

  sandbox = Oasis.createSandbox({
    url: "fixtures/assertions.html",
    services: {
      assertions: assertionsService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("shorthand - card can communicate with the environment through a port", function() {
  Oasis.register({
    url: "fixtures/assertions.html",
    capabilities: ['assertions']
  });

  stop();

  sandbox = Oasis.createSandbox({
    url: "fixtures/assertions.html"
  });

  sandbox.connect('assertions').then(function(port) {
    port.on('ok', function(data) {
      start();
      equal(data, 'success', "The card was able to communicate back");
    });
  });

  document.body.appendChild(sandbox.el);
});

test("environment can communicate with the card through a port", function() {
  Oasis.register({
    url: "fixtures/to_environment.html",
    capabilities: ['pingpong']
  });

  stop();

  var pingPongService = {
    sandboxLoaded: function(port, capability) {
      equal(capability, 'pingpong', "precond - capability is the pingpong service");

      port.on('pong', function(data) {
        start();
        equal(data, "PONG", "Got pong from the child");
      });

      port.send('ping', "PONG");
    }
  };

  sandbox = Oasis.createSandbox({
    url: 'fixtures/to_environment.html',
    services: {
      pingpong: pingPongService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("environment can request a value from a sandbox", function() {
  Oasis.register({
    url: "fixtures/promise.html",
    capabilities: ['promisepong']
  });

  stop();

  var pingPongPromiseService = {
    sandboxLoaded: function(port, capability) {
      port.request('ping').then(function(data) {
        start();

        equal(data, 'pong', "promise was resolved with expected value");
      });
    }
  };

  sandbox = Oasis.createSandbox({
    url: 'fixtures/promise.html',
    services: {
      promisepong: pingPongPromiseService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("sandbox can request a value from the environment", function() {
  Oasis.register({
    url: "fixtures/promise_request_from_environment.html",
    capabilities: ['promisepong']
  });

  stop();

  var pingPongPromiseService = {
    sandboxLoaded: function(port, capability) {
      port.receive('ping', function(promise) {
        promise.resolve('pong');
      });

      port.on('testResolvedToSatisfaction', function() {
        start();
        ok(true, "test was resolved to sandbox's satisfaction");
      });
    }
  };

  sandbox = Oasis.createSandbox({
    url: 'fixtures/promise_request_from_environment.html',
    services: {
      promisepong: pingPongPromiseService
    }
  });

  document.body.appendChild(sandbox.el);
});

module("Promise chains");

test("A promise can be chained", function() {
  stop();

  var promise = new Oasis.Promise();

  var next = promise.then(function(value) {
    var innerPromise = new Oasis.Promise();

    setTimeout(function() {
      innerPromise.resolve("innerValue");
    }, 10);

    return innerPromise;
  });

  var andNext = next.then(function(value) {
    start();
    equal(value, "innerValue");
  });

  promise.resolve("outerValue");
});

test("A promise error can be chained", function() {
  stop();

  var promise = new Oasis.Promise();

  var next = promise.then(function(value) {
    ok(false, "Should not get here");
  });

  var andNext = next.then(function(value) {
    ok(false, "Should not get here");
  }, function(error) {
    equal(error, "ERROR", "The error should propagate");
  });

  var andAndNext = andNext.then(function(value) {
    ok(false, "Should not get here");
  }, function(error) {
    start();
    equal(error, "ERROR", "The error should propagate");
  });

  promise.reject("ERROR");
});
