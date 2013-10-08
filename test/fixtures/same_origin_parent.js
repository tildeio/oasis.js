/*global _addEventListener */

new Oasis.RSVP.Promise(function (resolve, reject) {
  var n = 0;

  function waitForAsyncScript() {
    if (typeof _addEventListener === 'function') {
      resolve();
    } else if (++n < 10) {
      setTimeout(waitForAsyncScript, 100);
    } else {
      reject('_addEventListener not found');
    }
  }
  waitForAsyncScript();
}).then(function () {
  oasis.connect('assertions', function(port) {
    var assertions = port,
        iframe = document.createElement('iframe'),
        origin = location.protocol + "//" + location.hostname + ":" + (parseInt(location.port, 10) + 2);

    iframe.src = origin + "/fixtures/same_origin.html";

    _addEventListener(window, "message", function (event) {
      if( event.data === "childInitialized" ) {
        assertions.send('result', 'success');
      }
    });

    document.body.appendChild(iframe);
  });
}, Oasis.RSVP.rethrow);
