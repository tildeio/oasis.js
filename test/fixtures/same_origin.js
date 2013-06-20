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
  Oasis.connect('origin', function (port) {
    Oasis.RSVP.all(
      [Oasis.connect('assertions'), port.request('origin')]
    ).then(function (resolutions) {
      var assertions = resolutions[0],
          origin = resolutions[1],
          tag = document.createElement('iframe');

      tag.src = origin + "/fixtures/same_origin_request.html";
      document.body.appendChild(tag);

      _addEventListener(window, "message", function (event) {
        switch (event.data) {
          case "good morning":
            frames[0].postMessage("and to you", origin);
            break;
          case "thanks":
            assertions.send('result', 'success');
            break;
        }
      });
    }).then(null, function (error) {
      setTimeout( function () {
        throw error;
      });
    });
  });
}).then(null, function (error) {
  setTimeout( function () {
    throw error;
  });
});

