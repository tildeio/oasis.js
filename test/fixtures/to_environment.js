/*global importScripts*/
importScripts('/oasis.js');

Oasis.connect('pingpong', function(port) {
  port.on('ping', function(data) {
    port.send('pong', data);
  });
});
