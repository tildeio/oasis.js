Oasis.connect('pong', function(port) {
  port.onRequest('ping', function () {
    return new Oasis.RSVP.Promise(function (resolve, reject) {
      setTimeout( function () {
        reject('badpong');
      }, 1);
    });
  });
});
