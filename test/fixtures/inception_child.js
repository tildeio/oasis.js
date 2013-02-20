Oasis.connect('inception', function(port) {
  port.request('kick').then(function() {
    port.send('workPlacement');
  });
});
