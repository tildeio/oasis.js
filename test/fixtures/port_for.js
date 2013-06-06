function winterIsComing() {
  Oasis.portFor('assertions').send('whiteRaven', 'winter is coming');
}

function checkForNonExistentPort() {
  var assertionsPort = Oasis.portFor('assertions');

  try {
    Oasis.portFor('whiteharbor');
  } catch (e) {
    if (/whiteharbor.*did not provide one/.test(e.message)) {
      assertionsPort.send('redRaven', "no such port");
    } else {
      assertionsPort.send('redRaven', e.message);
    }
  }
}

Oasis.connect('assertions').then(function (port) {
  port.send('blackRaven', 'dark words');

  setTimeout(winterIsComing, 10);
  setTimeout(checkForNonExistentPort, 10);
});
