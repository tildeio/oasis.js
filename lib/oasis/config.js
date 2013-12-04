/**
  Stores Oasis configuration.  Options include:

  - `eventCallback` - a function that wraps `message` event handlers.  By
    default the event hanlder is simply invoked.
  - `allowSameOrigin` - a card can be hosted on the same domain
*/
function OasisConfiguration() {
  this.eventCallback = function (callback) { callback(); };
  this.allowSameOrigin = false;
}

export default OasisConfiguration;
