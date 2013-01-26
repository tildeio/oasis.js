/*global importScripts*/
importScripts('/oasis.js');

Oasis.connect('assertions', function(port) {
  port.send('ok', "success");
});
