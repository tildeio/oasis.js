/**
  Stores Oasis configuration.  Options include:

  - `oasisURL` - the default URL to use for sandboxes.
  - `eventCallback` - a function that wraps `message` event handlers.  By
    default the event hanlder is simply invoked.
*/
var configuration = {
  eventCallback: function (callback) { callback(); }
};

function configure(name, value) {
  configuration[name] = value;
}

export { configuration, configure };
