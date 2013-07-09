Oasis.connect('assertions').then(function (port) {
  Oasis.connect({
    consumers: {
      unprovidedCapability: Oasis.Consumer.extend({
        error: function () {
          port.send('consumerErrorInvoked');
        }
      })
    }
  });
});
