var AssertionsConsumer = Oasis.Consumer.extend({
  initialize: function(port) {
    port.send('ok', "success");
  },

  requests: {
    ping: function() {
      return 'pong';
    }
  },

  events: {
    ping: function() {
      this.send("pong");
    }
  }
});

Oasis.connect({
  consumers: {
    assertions: AssertionsConsumer
  }
});
