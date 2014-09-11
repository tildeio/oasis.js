/*global Window, UUID */

import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert, extend } from "oasis/util";
import { a_forEach, addEventListener, removeEventListener, a_map } from "oasis/shims";

import BaseAdapter from "oasis/base_adapter";

function verifySandbox(oasis, sandboxUrl) {
  if (oasis.configuration.sandboxed === false) { return; }
  var iframe = document.createElement('iframe'),
      link;

  if( (oasis.configuration.allowSameOrigin && iframe.sandbox !== undefined) ||
      (iframe.sandbox === undefined) ) {
    // The sandbox attribute isn't supported (IE8/9) or we want a child iframe
    // to access resources from its own domain (youtube iframe),
    // we need to make sure the sandbox is loaded from a separate domain
    link = document.createElement('a');
    link.href = sandboxUrl;

    if( !link.host || (link.protocol === window.location.protocol && link.host === window.location.host) ) {
      throw new Error("Security: iFrames from the same host cannot be sandboxed in older browsers and is disallowed.  " +
                      "For HTML5 browsers supporting the `sandbox` attribute on iframes, you can add the `allow-same-origin` flag" +
                      "only if you host the sandbox on a separate domain.");
    }
  }
}

function verifyCurrentSandboxOrigin(sandbox, event) {
  var linkOriginal, linkCurrent;

  if (sandbox.firstLoad || sandbox.options.reconnect === "any") {
    return true;
  }

  if (!sandbox.oasis.configuration.allowSameOrigin || event.origin === "null") {
    fail();
  } else {
    linkOriginal = document.createElement('a');
    linkCurrent = document.createElement('a');

    linkOriginal.href = sandbox.options.url;
    linkCurrent.href = event.origin;

    if (linkCurrent.protocol === linkOriginal.protocol &&
        linkCurrent.host === linkOriginal.host) {
      return true;
    }

    fail();
  }

  function fail() {
    sandbox.onerror(
      new Error("Cannot reconnect null origins unless `reconnect` is set to " +
                "'any'.  `reconnect: 'verify' requires `allowSameOrigin: " +
                "true`"));
  }
}

function isUrl(s) {
  var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  return regexp.test(s);
}

var IframeAdapter = extend(BaseAdapter, {
  //-------------------------------------------------------------------------
  // Environment API

  initializeSandbox: function(sandbox) {
    var options = sandbox.options,
        iframe = document.createElement('iframe');

    if(sandbox.oasis.configuration.sandboxed !== false) {
      var sandboxAttributes = ['allow-scripts'];

      if( sandbox.oasis.configuration.allowSameOrigin ) {
        sandboxAttributes.push('allow-same-origin');
      }
      if( options && options.sandbox && options.sandbox.popups ) {
        sandboxAttributes.push('allow-popups');
      }
      iframe.sandbox = sandboxAttributes.join(' ');
    }
    iframe.name = sandbox.options.url + '?uuid=' + UUID.generate();
    iframe.seamless = true;

    // rendering-specific code
    if (options.width) {
      iframe.width = options.width;
    } else if (options.height) {
      iframe.height = options.height;
    }

    // Error handling inside the iFrame
    iframe.errorHandler = function(event) {
      if(!event.data.sandboxException) {return;}
      try {
        // verify this message came from the expected sandbox; try/catch
        // because ie8 will disallow reading contentWindow in the case of
        // another sandbox's message
        if( event.source !== iframe.contentWindow ) {return;}
      } catch(e) {
        return;
      }

      sandbox.onerror( event.data.sandboxException );
    };
    addEventListener(window, 'message', iframe.errorHandler);

    verifySandbox( sandbox.oasis, sandbox.options.url );
    iframe.src = sandbox.options.url;

    Logger.log('Initializing sandbox ' + iframe.name);

    // Promise that sandbox has loaded and capabilities connected at least once.
    // This does not mean that the sandbox will be loaded & connected in the
    // face of reconnects (eg pages that navigate)
    sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
      iframe.initializationHandler = function (event) {
        if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
        try {
          // verify this message came from the expected sandbox; try/catch
          // because ie8 will disallow reading contentWindow in the case of
          // another sandbox's message
          if( event.source !== iframe.contentWindow ) {return;}
        } catch(e) {
          return;
        }
        removeEventListener(window, 'message', iframe.initializationHandler);

        sandbox.oasis.configuration.eventCallback(function () {
          Logger.log("container: iframe sandbox has initialized (capabilities connected)");
          resolve(sandbox);
        });
      };
      addEventListener(window, 'message', iframe.initializationHandler);
    }));

    sandbox.el = iframe;

    iframe.oasisLoadHandler = function (event) {
      if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
      try {
        // verify this message came from the expected sandbox; try/catch
        // because ie8 will disallow reading contentWindow in the case of
        // another sandbox's message
        if( event.source !== iframe.contentWindow ) {return;}
      } catch(e) {
        return;
      }

      Logger.log("container: iframe sandbox has loaded Oasis");


      if (verifyCurrentSandboxOrigin(sandbox, event)) {
        sandbox.createAndTransferCapabilities();
      }

      if (sandbox.options.reconnect === "none") {
        removeEventListener(window, 'message', iframe.oasisLoadHandler);
      }
    };
    addEventListener(window, 'message', iframe.oasisLoadHandler);
  },

  startSandbox: function(sandbox) {
    var head = document.head || document.documentElement.getElementsByTagName('head')[0];
    head.appendChild(sandbox.el);
  },

  terminateSandbox: function(sandbox) {
    var el = sandbox.el;

    sandbox.terminated = true;

    if (el.loadHandler) {
      // no load handler for HTML sandboxes
      removeEventListener(el, 'load', el.loadHandler);
    }
    removeEventListener(window, 'message', el.initializationHandler);
    removeEventListener(window, 'message', el.oasisLoadHandler);

    if (el.parentNode) {
      Logger.log("Terminating sandbox ", sandbox.el.name);
      el.parentNode.removeChild(el);
    }

    sandbox.el = null;
  },

  connectPorts: function(sandbox, ports) {
    var rawPorts = a_map.call(ports, function(port) { return port.port; }),
        message = this.createInitializationMessage(sandbox);

    if (sandbox.terminated) { return; }
    Window.postMessage(sandbox.el.contentWindow, message, '*', rawPorts);
  },

  //-------------------------------------------------------------------------
  // Sandbox API

  connectSandbox: function(oasis) {
    return BaseAdapter.prototype.connectSandbox.call(this, window, oasis);
  },

  oasisLoaded: function() {
    window.parent.postMessage(this.oasisLoadedMessage, '*', []);
  },

  didConnect: function() {
    window.parent.postMessage(this.sandboxInitializedMessage, '*', []);
  },

  name: function(sandbox) {
    return sandbox.el.name;
  }

});

export default IframeAdapter;
