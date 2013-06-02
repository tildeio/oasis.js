function Logger() {
  this.enabled = false;
}

Logger.prototype = {
  enable: function () {
    this.enabled = true;
  },

  log: function () {
    if (logger.enabled && typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log.apply(console, arguments);
    }
  }
}

var logger = new Logger;

export = logger;
