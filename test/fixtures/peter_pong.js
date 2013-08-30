oasis.connect('peterpong', function(port) {
  port.send('peter');

  port.on('ping', function() {
    port.send('pong');
  });
});
