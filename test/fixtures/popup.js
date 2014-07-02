oasis.connect('assertions').then(function(port) {
  var popup = null,
      popupOpened;

  try {
    popup = window.open('popup.html', 'popopopop');
  }
  catch(e) {
  }
  popupOpened = !!popup;

  port.send('ok', popupOpened);

  if(popup) {
    popup.close();
  }
});
