Oasis.connect('promisepong', function(port) {
  port.onRequest('ping', function(promise, firstArg, secondArg) {
    if (firstArg === 'first' && secondArg === 'second') {
      promise.resolve('pong');
    } else {
      promise.reject("Arguments were not passed to the request.");
    }
  });
});
