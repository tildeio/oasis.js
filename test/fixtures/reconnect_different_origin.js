var destinationOrigin = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 2),
    destinationUrl = destinationOrigin + '/fixtures/reconnect2.html';

oasis.connect('assertions').then(function (port) {
  port.request('firstLoad').then(function () {
    location.href = destinationUrl;
  });
});

