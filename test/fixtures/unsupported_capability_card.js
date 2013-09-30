oasis.connect('blue').then(function (port) {
  port.send('checkCapabilities');
});
