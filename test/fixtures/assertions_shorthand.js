/*global importScripts*/
importScripts('oasis.js');

var AssertionsConsumer = Oasis.Consumer.extend({
  initialize: function(port) {
    port.send('ok', "success");
  },

  requests: {
    ping: function(resolver) {
      resolver.resolve("pong");
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
