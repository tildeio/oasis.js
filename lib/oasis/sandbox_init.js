import iframeAdapter from "oasis/iframe_adapter";
import webworkerAdapter from "oasis/webworker_adapter";

function autoInitializeSandbox () {
  if (typeof window !== 'undefined') {
    if (/PhantomJS/.test(navigator.userAgent)) {
      // We don't support phantomjs for several reasons, including
      //  - window.constructor vs Window
      //  - postMessage must not have ports (but recall in IE postMessage must
      //    have ports)
      //  - because of the above we need to polyfill, but we fail to do so
      //    because we see MessageChannel in global object
      //  - we erroneously try to decode the oasis load message; alternatively
      //    we should just encode the init message
      //  - all the things we haven't noticed yet
      return;
    }

    if (window.parent && window.parent !== window) {
      self.oasis = new self.Oasis();
      iframeAdapter.connectSandbox(self.oasis);
    }
  } else {
    self.oasis = new self.Oasis();
    webworkerAdapter.connectSandbox(self.oasis);
  }
}

export default autoInitializeSandbox;
