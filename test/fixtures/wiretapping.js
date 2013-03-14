Oasis.connect('assertions', function(port) {
  port.send('receivedAssertion');
});

Oasis.connect('otherStuff', function(port) {
  port.send('receivedOther');
});
