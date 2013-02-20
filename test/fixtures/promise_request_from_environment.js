Oasis.connect('promisepong', function(port) {
  port.request('ping').then(function(data) {
    if (data === 'pong') {
      port.send('testResolvedToSatisfaction');
    }
  });
});
