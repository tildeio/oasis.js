/* global docCookies */
oasis.connect('assertions').then(function(port) {
  var oasisCookieValue = docCookies.getItem('oasis');
  docCookies.removeItem('oasis2');
  docCookies.setItem('oasis2', 'value-from-iframe', false, '/');
  port.send('ok', oasisCookieValue);
});
