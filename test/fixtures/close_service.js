Oasis.connect('close', function(port) {
  port.send('ok');
});
