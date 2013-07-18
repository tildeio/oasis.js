Oasis.connect('inception', function(port) {
  port.request('kick').then(function(value) {
    port.send('workPlacement', value);
  });
});
