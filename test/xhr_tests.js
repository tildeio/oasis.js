/*global oasis:true */

import RSVP from "rsvp";
import { xhr } from "oasis/xhr";

module('oasis.xhr', {
  setup: function() { oasis = new Oasis(); }
});


test("listeners are invoked on send", function() {
  expect(1);
  stop(2);

  oasis.on('xhr.send', function () {
    start();
    ok(true, 'send listener was called');
  });

  oasis.xhr('/fixtures/index.js').then(function () {
    start();
  }).fail(RSVP.rethrow);
});

test("listeners are invoked on load", function() {
  stop();
  expect(1);

  oasis.on('xhr.load', function () {
    start();
    ok(true, 'load listener was called');
  });

  oasis.xhr('/fixtures/index.js').fail(RSVP.rethrow);
});
