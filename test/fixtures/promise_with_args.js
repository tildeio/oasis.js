Oasis.connect('promisepong', function(port) {
  port.onRequest('ping', function(resolve, firstArg, secondArg) {
    if (firstArg === 'first' && secondArg === 'second') {
      resolve('pong');
    } else {
      promise.reject("Arguments were not passed to the request.");
    }
  });
});
