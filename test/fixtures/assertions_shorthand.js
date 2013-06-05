var AssertionsConsumer = Oasis.Consumer.extend({
  initialize: function(port) {
    port.send('ok', "success");
  },

  requests: {
    ping: function(promise) {
      promise.resolve("pong");
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
