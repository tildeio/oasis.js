/*global importScripts*/
importScripts('oasis.js');

Oasis.connect('assertions').then(function(port) {
  port.send('ok', "success");
});
