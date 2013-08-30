oasis.connect('assertions', function(port) {
  port.send('receivedAssertion');
});

oasis.connect('otherStuff', function(port) {
  port.send('receivedOther');
});
