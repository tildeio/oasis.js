Oasis.connect('promisepong', function(port) {
  port.onRequest('ping', function(resolve) {
    resolve('pong');
  });
});
