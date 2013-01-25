/*global importScripts*/
importScripts('oasis.js');

Oasis.connect('peterpong').then(function(port) {
  port.send('peter');

  port.on('ping', function() {
    port.send('pong');
  });
});
