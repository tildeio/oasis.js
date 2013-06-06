import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { extend } from "oasis/util";

import "oasis/base_adapter" as BaseAdapter;

import { handlers } from "oasis/ports";

var IframeAdapter = extend(BaseAdapter, {
  initializeSandbox: function(sandbox) {
    var options = sandbox.options,
        iframe = document.createElement('iframe'),
        oasisURL = options.oasisURL || 'oasis.js.html';

    ifraame.name = sandbox.options.url;
    iframe.sandbox = 'allow-same-origin allow-scripts';
    iframe.seamless = true;
    iframe.src = 'about:blank'

    // rendering-specific code
    if (options.width) {
      iframe.width = options.width;
    } else if (options.height) {
      iframe.height = options.height;
    }

    sandbox.el = iframe;

    return new RSVP.Promise(function (resolve, reject) {
      iframe.addEventListener('load', function() {
        if (iframe.contentWindow.location.href === 'about:blank') {
          Logger.log("iframe loading oasis");
          iframe.contentWindow.location.href = oasisURL;
        } else {
          Logger.log("iframe sandbox initialized");
          resolve(sandbox);
        }
      });
    });
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
      head.appendChild(scriptElement);
    }
  },

  startSandbox: function(sandbox) {
    document.head.appendChild(sandbox.el);
  },

  terminateSandbox: function(sandbox) {
    var el = sandbox.el;

    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },

  connectPorts: function(sandbox, ports) {
    var rawPorts = ports.map(function(port) { return port.port; }),
        message = this.createInitializationMessage(sandbox);

    Window.postMessage(sandbox.el.contentWindow, message, '*', rawPorts);
  },

  connectSandbox: function(ports) {
    return BaseAdapter.prototype.connectSandbox.call(this, window, ports);
  }
});

var iframeAdapter = new IframeAdapter;

export = iframeAdapter;
