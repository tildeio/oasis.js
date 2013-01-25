/*global importScripts*/
importScripts('oasis.js');

Oasis.connect('inception').then(function(port) {
  port.request('kick').then(function() {
    port.send('workPlacement');
  });
});
