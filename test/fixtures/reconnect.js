oasis.connect('assertions').then(function (port) {
  port.request('firstLoad').then(function () {
    location.href = 'reconnect2.html';
  });
});
