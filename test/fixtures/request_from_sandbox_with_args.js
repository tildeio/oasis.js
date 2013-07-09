Oasis.connect('pong', function(port) {
  port.request('ping', 'first', 'second').then(function(data) {
    if (data === 'pong') {
      port.send('testResolvedToSatisfaction');
    }
  });
});
