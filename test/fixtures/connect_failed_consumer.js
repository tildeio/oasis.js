Oasis.connect('assertions').then(function (port) {
  Oasis.connect({
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
