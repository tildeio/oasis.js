Oasis.connect('origin', function (port) {
  Oasis.RSVP.all(
    [Oasis.connect('assertions'), port.request('origin')]
  ).then(function (resolutions) {
    var assertions = resolutions[0],
        origin = resolutions[1],
        tag = document.createElement('iframe');

    tag.src = origin + "/fixtures/same_origin_request.html";
    document.body.appendChild(tag);

    window.addEventListener("message", function (event) {
      switch (event.data) {
        case "good morning":
          frames[0].postMessage("and to you", origin);
          break;
        case "thanks":
          assertions.send('result', 'success');
          break;
      }
    });
  });
});
