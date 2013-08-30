oasis.connect('close', function(port) {
  port.on('ping', function() {
    port.send('pong');
  });

  port.send('sandboxInitialized');
});
