Oasis.connect('assertions', function(port) {
  var href;

  if (typeof location !== 'undefined') {
    href = location.href;
  } else {
    href = Oasis.config.oasisURL;
  }

  port.send('checkUrl', href);
});
