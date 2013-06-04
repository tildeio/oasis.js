Oasis.connect('peterpong', function(port) {
  port.send('peter');

  port.onRequest('ping', function(promise) {
    promise.resolve('pong');
  });
});
