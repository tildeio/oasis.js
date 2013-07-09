Oasis.connect('pong', function(port) {
  port.onRequest('ping', function() {
    throw new Error('badpong');
  });
});
