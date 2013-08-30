oasis.connect('pong', function(port) {
  port.onRequest('ping', function(firstArg, secondArg) {
    if (firstArg === 'first' && secondArg === 'second') {
      return 'pong';
    }  else {
      return 'not-pong';
    }
  });
});
