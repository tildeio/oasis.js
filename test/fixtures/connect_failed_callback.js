Oasis.connect('assertions').then(function (port) {
  Oasis.connect('unprovidedCapability', function(){}, function() {
    port.send('errorCallbackInvoked');
  });
});
