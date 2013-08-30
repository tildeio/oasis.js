function winterIsComing() {
  oasis.portFor('assertions').send('whiteRaven', 'winter is coming');
}

function checkForNonExistentPort() {
  var assertionsPort = oasis.portFor('assertions');

  try {
    oasis.portFor('whiteharbor');
  } catch (e) {
    if (/whiteharbor.*did not provide one/.test(e.message)) {
      assertionsPort.send('redRaven', "no such port");
    } else {
      assertionsPort.send('redRaven', e.message);
    }
  }
}

oasis.connect('assertions').then(function (port) {
  port.send('blackRaven', 'dark words');

  setTimeout(winterIsComing, 10);
  setTimeout(checkForNonExistentPort, 10);
});
