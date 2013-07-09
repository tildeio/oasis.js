Oasis.connect('assertions').then(function (port) {
  Oasis.connect('unprovidedCapability').then(null, function () {
    port.send('promiseRejected');
  });
});
