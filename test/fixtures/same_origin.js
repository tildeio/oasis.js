/*global _addEventListener */

// TODO: ie8, ie9 synchronous dependencies
new Oasis.RSVP.Promise(function (resolve, reject) {
  var n = 0;

  function waitForAsyncScript() {
    if (typeof _addEventListener === 'function') {
      resolve();
    } else if (++n < 10) {
      setTimeout(waitForAsyncScript, 100);
    }
  }
  waitForAsyncScript();
}).then(function () {
  Oasis.connect('assertions', function (port) {
    var assertions = port,
        tag = document.createElement('iframe'),
        origin = window.location.protocol + "//" + window.location.host;

    tag.src = origin + "/fixtures/same_origin_request.html";

    _addEventListener(window, "message", function (event) {
      switch (event.data) {
        case "good morning":
          frames[0].postMessage("and to you", '*', []);
          break;
        case "thanks":
          assertions.send('result', 'success');
          break;
      }
    });

    document.body.appendChild(tag);
  });
});
