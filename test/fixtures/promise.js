/*global importScripts*/
importScripts('/oasis.js');

Oasis.connect('promisepong', function(port) {
  port.onRequest('ping', function(promise) {
    promise.resolve('pong');
  });
});
