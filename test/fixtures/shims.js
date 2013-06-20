function _addEventListener(receiver, eventName, fn) {
  if (receiver.addEventListener) {
    return receiver.addEventListener(eventName, fn);
  } else if (receiver.attachEvent) {
    return receiver.attachEvent('on' + eventName, fn);
  }
}
