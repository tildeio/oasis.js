/**
  Stores Oasis configuration.  Options include:

  - `oasisURL` - the default URL to use for sandboxes.
  - `eventCallback` - a function that wraps `message` event handlers.  By
    default the event hanlder is simply invoked.
  - `allowSameOrigin` - a card can be hosted on the same domain
*/
function OasisConfiguration() {
  this.oasisURL = 'oasis.js.html';
  this.eventCallback = function (callback) { callback(); };
  this.allowSameOrigin = false;
}

export default OasisConfiguration;
