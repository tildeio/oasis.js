setTimeout(function() {
  oasis.connect('assertions').then(function(port) {
    port.on('ping', function() {
      port.send('pong');
    });
  });
}, 50);
