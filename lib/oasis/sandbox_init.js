import "oasis/iframe_adapter" as iframeAdapter;
import "oasis/webworker_adapter" as webworkerAdapter;

import { ports } from "oasis/ports";

function initializeSandbox () {
  if (typeof window !== 'undefined') {
    iframeAdapter.connectSandbox(ports);
    Window.postMessage(window.parent, {isIframeLoaded: true}, '*', []);
  } else {
    webworkerAdapter.connectSandbox(ports);
    postMessage({isWorkerLoaded: true}, []);
  }
};

export = initializeSandbox;
