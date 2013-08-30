oasis.connect('wrappedEvents').then(function (port) {
  port.send('wrapMe');
});
