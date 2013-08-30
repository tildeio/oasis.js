var AssertionsConsumer = Oasis.Consumer.extend({
  initialize: function() {
    oasis.consumers.assertions.send('ok');
  }
});

oasis.connect({
  consumers: {
    assertions: AssertionsConsumer
  }
});
