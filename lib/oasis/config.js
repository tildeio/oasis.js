/**
  Stores Oasis configuration.  Options include:

  - `eventCallback` - a function that wraps `message` event handlers.  By
    default the event hanlder is simply invoked.
  - `allowSameOrigin` - a card can be hosted on the same domain
  - `reconnect` - the default reconnect options for iframe sandboxes.  Possible values are:
    - "none" - do not allow sandbox reconnection
    - "verify" - only allow reconnections from the original origin of the sandbox
    - "any" - allow any sandbox reconnections.  Only use this setting if you are
      using Oasis strictly for isolation of trusted applications or if it's safe
      to connect your sandbox to arbitrary origins.  This is an advanced setting
      and should be used with care.
*/
function OasisConfiguration() {
  this.eventCallback = function (callback) { callback(); };
  this.allowSameOrigin = false;
  this.reconnect = 'verify';
}

export default OasisConfiguration;
