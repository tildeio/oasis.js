oasis.connect('peterpong', function(port) {
  port.send('peter');

  port.onRequest('ping', function() {
    return 'pong';
  });
});
