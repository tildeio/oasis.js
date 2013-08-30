oasis.connect('promisepong', function(port) {
  port.onRequest('ping', function() {
    return new Oasis.RSVP.Promise(function (resolve, reject) {
      setTimeout( function () {
        resolve('pong');
      }, 1);
    });
  });
});
