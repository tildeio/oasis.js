/*global Window, UUID */

import RSVP from "rsvp";
import Logger from "oasis/logger";
import { assert, extend } from "oasis/util";
import { addEventListener, removeEventListener, a_map } from "oasis/shims";

import BaseAdapter from "oasis/base_adapter";

function verifySandbox(oasis, sandboxUrl) {
  var iframe = document.createElement('iframe'),
      link;

  if( !oasis.configuration.allowSameOrigin && iframe.sandbox === undefined ) {
    // The sandbox attribute isn't supported,
    // we need to make sure the sandbox is loaded from a separate domain
    link = document.createElement('a');
    link.href = sandboxUrl;

    if( !link.host || (link.protocol === window.location.protocol && link.host === window.location.host) ) {
      throw new Error("Security: iFrames from the same host cannot be sandboxed in older browsers and is disallowed.  " +
                      "You can override this behaviour with `Oasis.configure('allowSameOrigin', true)`, but please be " +
                      "absolutely sure you know this is safe for your environment before doing so.");
    }
  }
}

var IframeAdapter = extend(BaseAdapter, {
  //-------------------------------------------------------------------------
  // Environment API

  initializeSandbox: function(sandbox) {
    var options = sandbox.options,
        iframe = document.createElement('iframe'),
        oasisURL = this.oasisURL(sandbox);

    iframe.name = sandbox.options.url + '?uuid=' + UUID.generate();
    iframe.sandbox = 'allow-scripts';
    iframe.seamless = true;

    // rendering-specific code
    if (options.width) {
      iframe.width = options.width;
    } else if (options.height) {
      iframe.height = options.height;
    }

    switch (sandbox.type) {
      case 'js':
        verifySandbox( sandbox.oasis, oasisURL );
        this._setupIFrameBootstrap(iframe, sandbox, oasisURL);
        break;
      case 'html':
        verifySandbox( sandbox.oasis, sandbox.options.url );
        iframe.src = sandbox.options.url;
        break;
      default:
        assert(false, "IFrame Adapter only supports sandbox types `js` and `html`, not `" + sandbox.type + "`");
    }

    Logger.log('Initializing sandbox ' + iframe.name);

    // Promise that sandbox is loaded and capabilities are connected
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

    // Promise that sandbox is loaded; capabilities not connected
    return new RSVP.Promise(function (resolve, reject) {
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
        removeEventListener(window, 'message', iframe.oasisLoadHandler);

        sandbox.oasis.configuration.eventCallback(function () {
          Logger.log("container: iframe sandbox has loaded Oasis");
          resolve(sandbox);
        });
      };
      addEventListener(window, 'message', iframe.oasisLoadHandler);
    });
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

  loadScripts: function (base, scriptURLs) {
    var head = document.head || document.documentElement.getElementsByTagName('head')[0],
        scriptElement;

    var baseElement = document.createElement('base');
    baseElement.href = base;
    head.insertBefore(baseElement, head.childNodes[0] || null);

    for (var i = 0; i < scriptURLs.length; ++i ) {
      scriptElement = document.createElement('script');
      scriptElement.src = scriptURLs[i];
      scriptElement.async = false;
      head.appendChild(scriptElement);
    }
  },

  name: function(sandbox) {
    return sandbox.el.name;
  },

  //-------------------------------------------------------------------------
  // private

  _setupIFrameBootstrap: function (iframe, sandbox, oasisURL) {
    iframe.src = 'about:blank';
    iframe.loadHandler = function () {
      removeEventListener(iframe, 'load', iframe.loadHandler);

      sandbox.oasis.configuration.eventCallback(function () {
        Logger.log("iframe loading oasis");
        iframe.contentWindow.location.href = oasisURL;
      });
    };
    addEventListener(iframe, 'load', iframe.loadHandler);
  }
});

var iframeAdapter = new IframeAdapter();

export default iframeAdapter;
