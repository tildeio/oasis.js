oasis.connect('pong', function(port) {
  port.onRequest('ping', function () {
    return new Oasis.RSVP.Promise(function (resolve, reject) {
      setTimeout( function () {
        try {
          throw new Error('badpong');
        } catch (error) {
          reject(error);
        }
      }, 1);
    });
  });
});
