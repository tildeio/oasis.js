import "rsvp" as RSVP;
import "oasis/logger" as Logger;
import { extend } from "oasis/util";
import { addEventListener, removeEventListener, a_map } from "oasis/shims";

import "oasis/base_adapter" as BaseAdapter;

import { handlers } from "oasis/ports";

var IframeAdapter = extend(BaseAdapter, {
  initializeSandbox: function(sandbox) {
    var options = sandbox.options,
        iframe = document.createElement('iframe'),
        oasisURL = this.oasisURL(sandbox),
        iframeLoaded = false;

    iframe.name = sandbox.options.url;
    iframe.sandbox = 'allow-same-origin allow-scripts';
    iframe.seamless = true;
    iframe.src = 'about:blank';

    // rendering-specific code
    if (options.width) {
      iframe.width = options.width;
    } else if (options.height) {
      iframe.height = options.height;
    }

    iframe.oasisLoadHandler = function () {
      removeEventListener(iframe, 'load', iframe.oasisLoadHandler);

      Logger.log("iframe loading oasis");
      iframe.contentWindow.location.href = oasisURL;
    };
    addEventListener(iframe, 'load', iframe.oasisLoadHandler);

    sandbox.promise = new RSVP.Promise( function(resolve, reject) {
      iframe.initializationHandler = function (event) {
        if( !event.data.isSandboxInitialized ) {return;}
        removeEventListener(window, 'message', iframe.initializationHandler);

        Logger.log("iframe sandbox initialized");
        resolve(sandbox);
      };
      addEventListener(window, 'message', iframe.initializationHandler);
    });

    sandbox.el = iframe;

    return new RSVP.Promise(function (resolve, reject) {
      iframe.loadHandler = function (event) {
        if( !event.data.isIframeLoaded ) {return;}
        removeEventListener(window, 'message', iframe.loadHandler);

        Logger.log("iframe sandbox loaded");
        resolve(sandbox);
      };
      addEventListener(window, 'message', iframe.loadHandler);
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
      scriptElement.async = false;
      head.appendChild(scriptElement);
    }
  },

  didConnect: function() {
    Window.postMessage(window.parent, {isSandboxInitialized: true}, '*', []);
  },

  startSandbox: function(sandbox) {
    var head = document.head || document.documentElement.getElementsByTagName('head')[0];
    head.appendChild(sandbox.el);
  },

  terminateSandbox: function(sandbox) {
    var el = sandbox.el;

    el.terminated = true;
    removeEventListener(el, 'load', el.oasisLoadHandler);
    removeEventListener(window, 'message', el.initializationHandler);
    removeEventListener(window, 'message', el.loadHandler);

    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },

  connectPorts: function(sandbox, ports) {
    var rawPorts = a_map.call(ports, function(port) { return port.port; }),
        message = this.createInitializationMessage(sandbox),
        el = sandbox.el;

    if (el.terminated) { return; }
    Window.postMessage(sandbox.el.contentWindow, message, '*', rawPorts);
  },

  connectSandbox: function(ports) {
    return BaseAdapter.prototype.connectSandbox.call(this, window, ports);
  }
});

var iframeAdapter = new IframeAdapter;

export = iframeAdapter;
