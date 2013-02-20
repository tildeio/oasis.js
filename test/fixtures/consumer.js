var AssertionsConsumer = Oasis.Consumer.extend({
  initialize: function() {
    Oasis.consumers.assertions.send('ok');
  }
});

Oasis.connect({
  consumers: {
    assertions: AssertionsConsumer
  }
});
