var formSubmitted = false,
    submitFn = function() {
      formSubmitted = true;
    };

oasis.connect('assertions').then(function(port) {
  var form = document.createElement('form');

  form.setAttribute('method', 'post');
  form.setAttribute('action', 'javascript:submitFn()');

  document.getElementsByTagName('body')[0].appendChild(form);

  form.submit();
  // Using a timer seems brittle
  setTimeout(function() {
    port.send('ok', formSubmitted);
  }, 100);
});
