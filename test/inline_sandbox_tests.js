/*global oasis:true */

import Oasis from "oasis";
import RSVP from "rsvp";
import InlineAdapter from "oasis/inline_adapter";

import { o_create } from "oasis/shims";

var oasis, interval;

module('Inline Sandboxes', {
  setup: function() {
    oasis = new Oasis();
  },

  teardown: function() {
    if (interval) {
      clearInterval(interval);
    }
    if (typeof simpleDependencyLoaded !== 'undefined') {
      window.simpleDependencyLoaded = undefined;
    }
  }
});

test("it exists", function() {
  expect(1);
  ok(InlineAdapter, 'namespace is present');
});

test("the inline adapter is listed in `Oasis.adapters`", function() {
  expect(1);
  equal(Oasis.adapters.inline, InlineAdapter, "Inline adapter is included in `Oasis.adapters`");
});

test("throws an error if the sandbox type is html", function() {
  expect(1);
  raises(function() {
    oasis.createSandbox({
      url: "fixtures/html_sandbox.html",
      type: 'html',
      adapter: InlineAdapter,
      capabilities: ['assertions'],
      services: {
        assertions: Oasis.Service
      }
    });
  }, Error, "Creating a sandbox with type: html but adapter: inline fails.");
});

if (typeof HTMLElement !== 'undefined') {
  test("can be created", function() {
    expect(2);
    var sandbox = oasis.createSandbox({
      url: 'fixtures/simple_value.js',
      adapter: InlineAdapter,
      capabilities: ['assertions'],
      services: {
        assertions: Oasis.Service
      }
    });

    ok(sandbox, 'expected sandbox to be created');
    sandbox.start();

    ok(sandbox.el instanceof HTMLElement, 'has DOM element');
  });
}

test("can load dependencies", function() {
  stop(2);
  expect(1);

  var sandbox = oasis.createSandbox({
    url: 'fixtures/simple_value.js',
    adapter: InlineAdapter,
    dependencies: ['fixtures/simple_dependency.js'],
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service
    }
  });

  sandbox.start();
  sandbox.waitForLoad().then(function(){
    start();
  });

  // Although we could use promises here for the inline adapter, we cannot
  // generally do so because script loading will be forced async. in ie8 and
  // ie9.  When we work around this issue, we should make this test a common
  // test.
  interval = setInterval (function () {
    if (window.simpleDependencyLoaded) {
      clearInterval(interval);
      ok(true, "dependency was loaded");
      start();
    }
  }, 10);
});

test("communication", function(){
  expect(1);
  stop();

  var PingPongService = Oasis.Service.extend({
    initialize: function(port, capability) {
      port.request('ping').then(function(data) {
        start();

        equal(data, 'pong', "promise was resolved with expected value");
      });
    }
  });

  var sandbox = oasis.createSandbox({
    url: 'fixtures/simple_value.js',
    adapter: InlineAdapter,
    capabilities: ['pong'],
    services: {
      pong: PingPongService
    }
  });

  sandbox.start();
});

test("2 sandboxes", function(){
  expect(3);

  var sandbox1 = oasis.createSandbox({
    url: 'fixtures/simple_value.js',
    adapter: InlineAdapter,
    capabilities: ['pong'],
    services: {
      pong: Oasis.Service
    }
  });

  var sandbox2 = oasis.createSandbox({
    url: 'fixtures/simple_value_with_args.js',
    adapter: InlineAdapter,
    capabilities: ['pong'],
    services: {
      pong: Oasis.Service
    }
  });

  stop();
  RSVP.all([sandbox1.waitForLoad(), sandbox2.waitForLoad()]).then(function (value) {
    stop(2);

    var request1 = sandbox1.capabilities.pong.request('ping').then(function(data) {
      start();
      equal(data, 'pong', "sandbox1.request(ping) resolved correctly");
    }, function (reason) {
      start();
      ok(false, reason);
    });

    var request2 = sandbox2.capabilities.pong.request('ping').then(function(data) {
      start();
      equal(data, 'not-pong', "sandbox2.request(ping no args) resolved correctly");
    }, function (reason) {
      start();
      ok(false, reason);
    });

    var request3 = sandbox2.capabilities.pong.request('ping', 'first', 'second').then(function(data) {
      start();
      equal(data, 'pong', "sandbox2.request(ping with args) resolved correctly");
    }, function (reason) {
      start();
      ok(false, reason);
    });

    return RSVP.all([request1, request2, request3]);
  }, function (reason) {
    start();
    ok(false, reason);
  });

  sandbox1.start();
  sandbox2.start();
});

test("subclasses can customize resource wrapping", function() {
  expect(1);
  stop();

  var MyInlineAdapter = o_create(InlineAdapter);
  MyInlineAdapter.wrapResource = function(code) {
    return new Function("oasis", "oasis._customWrapper=true;" + code);
  };

  var sandbox = oasis.createSandbox({
    url: 'fixtures/index.js',
    adapter: MyInlineAdapter,
    capabilities: ['assertions'],
    services: {
      assertions: Oasis.Service
    }
  });

  sandbox.waitForLoad().then(function () {
    ok(sandbox.sandboxedOasis._customWrapper, "Subclass was able to specify a custom wrapper");
    start();
  });
});
