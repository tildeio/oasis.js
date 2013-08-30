oasis.connect('pong', function(port) {
  port.request('ping').then(function(data) {
    if (data === 'pong') {
      port.send('testResolvedToSatisfaction');
    }
  }, function (error) {
    if (error === 'badpong') {
      port.send('testResolvedToSatisfaction');
    }
  });
});
