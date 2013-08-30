oasis.connect('assertions').then(function (port) {
  oasis.connect('unprovidedCapability').then(null, function () {
    port.send('promiseRejected');
  });
});
