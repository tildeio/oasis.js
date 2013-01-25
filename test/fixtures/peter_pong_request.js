/*global importScripts*/
importScripts('oasis.js');

Oasis.connect('peterpong').then(function(port) {
  port.send('peter');

  port.onRequest('ping', function(request) {
    request.resolve('pong');
  });
});
