oasis.logger.enable();
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
        oasis.connect('assertions').then(function (port) {
          port.send('consumerErrorInvoked');
        });
      }
    })
  }
});
