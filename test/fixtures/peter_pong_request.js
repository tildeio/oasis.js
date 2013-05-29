Oasis.connect('peterpong', function(port) {
  port.send('peter');

  port.onRequest('ping', function(resolve) {
    resolve('pong');
  });
});
