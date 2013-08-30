oasis.connect('pong', function(port) {
  port.onRequest('ping', function() {
    return 'pong';
  });
});
