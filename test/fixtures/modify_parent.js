oasis.connect('assertions').then(function(port) {
  var ok = false;
  try {
    window.parent.testProperty = 'hello from iframe';
    ok = true;
  } catch (e) {}

  port.send('ok', ok);
});
