Oasis.connect('peterpong', function(port) {
  port.send('peter');

  port.onRequest('ping', function(request) {
    request.resolve('pong');
  });
});
