oasis.connect('assertions').then(function (port) {
  port.send('secondLoad');
});
