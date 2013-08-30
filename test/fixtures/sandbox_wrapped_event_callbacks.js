var inWrapper = false;

oasis.configure('eventCallback', function (callback) {
  inWrapper = true;
  callback();
  inWrapper = false;
});

oasis.connect({
  consumers: {
    wrappedEvents: Oasis.Consumer.extend({
      initialize: function (port) {
        port.all( function () {
          port.send('wiretapResult', inWrapper);
        }, this);
      },
      events: {
        wrapMe: function () {
          this.send('eventResult', inWrapper);
        }
      }
    })
  }
});
