oasis.logger.enable();
oasis.connect('assertions').then(function (port) {
  oasis.connect({
    consumers: {
      unprovidedCapability: Oasis.Consumer.extend({
        events: {
          doAThing: function () {}
        },
        requests: {
          getSomeStuff: function () {}
        },

        error: function () {
          port.send('consumerErrorInvoked');
        }
      })
    }
  });
});
