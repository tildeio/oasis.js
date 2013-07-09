import "oasis/iframe_adapter" as iframeAdapter;
import "oasis/webworker_adapter" as webworkerAdapter;

import { ports } from "oasis/globals";

function initializeSandbox () {
  if (typeof window !== 'undefined') {
    iframeAdapter.connectSandbox(ports);
  } else {
    webworkerAdapter.connectSandbox(ports);
  }
};

export = initializeSandbox;
