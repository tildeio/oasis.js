var assertions;

Oasis.connect({
  consumers: {
    assertions: Oasis.Consumer.extend({
      initialize: function () { assertions = this; }
    }),
    something: Oasis.Consumer.extend({
      events: {
        go: function () {
          assertions.send('somethingOkay');
        }
      }
    }),
    somethingElse: Oasis.Consumer.extend({
      events: {
        go: function () {
          assertions.send('somethingElseOkay');
        }
      }
    })
  }
});
