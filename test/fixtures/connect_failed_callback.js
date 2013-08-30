oasis.connect('assertions').then(function (port) {
  oasis.connect('unprovidedCapability', function(){}, function() {
    port.send('errorCallbackInvoked');
  });
});
