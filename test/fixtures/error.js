/* global Window */
var message = {sandboxException: "An error occured"};

if( typeof Window !== "undefined" ) {
  Window.postMessage( window.parent, message, "*");
} else {
  Worker.postMessage( this, message, [] );
}
