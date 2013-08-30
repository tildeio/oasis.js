oasis.connect('pong').then(function (port) {
  port.onRequest('ping', function () {
    // undefined returns are treated as errors
  });
});
