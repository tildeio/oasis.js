# Oasis.js

[![Build Status](https://secure.travis-ci.org/tildeio/oasis.js.png?branch=master)](http://travis-ci.org/tildeio/oasis.js)

Oasis.js is a pleasant API for safe communication with untrusted code in
sandboxed iframes.

For example, imagine we are using a third-party profile viewer to
display information about a user. We only want to expose the bare
minimum required to use the widget, without giving it access to all of
the parent's environment.

Here is what your application would look like:

```html
<!doctype html>

<html>
  <head>
    <script src="http://example.com/oasis.js.html"></script>
  </head>
  <body>
    <script>
      var sandbox = oasis.createSandbox({
        url: 'http://example.com/profile_viewer.html',
        type: 'html',
        capabilities: [ 'account' ]
      });

      sandbox.connect('account').then(function(port) {
        port.onRequest('profile', function () {
          return { email: 'wycats@gmail.com' };
        });
      });

      document.body.appendChild(sandbox.el);
    </script>
  </body>
</html>
```

And here is the profile viewer widget (hosted either on your domain
or a third-party's domain):

```html
<!doctype html>

<html>
  <head>
    <script src="http://example.com/jquery.js"></script>
    <script src="http://example.com/oasis.js.html"></script>
  </head>
  <body>
    <div>
      <p>Email: <span id="email"><img src="loading.png"></span></p>
    </div>
    <script>
      oasis.connect('account').then(function(port) {
        port.request('profile').then(function(profile) {
          $("#email").html(profile.email);
        });
      });
    </script>
  </body>
</html>
```

# API

## Creating Sandboxes

Sandboxed applications or widgets can be hosted as JavaScript or HTML.  Both can
be sandboxed inside an iframe, but Oasis can also sandbox JavaScript widgets
inside a web worker.

Sandboxes are created via the `createSandbox` API.

Here is an example of creating an iframe sandbox for a JavaScript widget:
```js
oasis.createSandbox({
  url: 'http://example.com/profile_viewer.js',
  capabilities: [ 'account' ]
});
```

When creating JavaScript sandboxes it is necessary to host Oasis on the same
domain as the sandboxed JavaScript (see [Browser Support](#requirements--browser-support)).

Here is an example of creating an iframe sandbox for an HTML widget:
```js
oasis.createSandbox({
  url: 'http://example.com/profile_viewer.html',
  type: 'html',
  capabilities: [ 'account' ]
});
```

When creating HTML sandboxes, it is the sandbox's responsibility to load Oasis
(typically via a script tag in the head element).

Sandboxed widgets that require no UI can be loaded as web workers:
```js
  url: 'http://example.com/profile_information.js',
  capabilities: [ 'account' ],
  adapter: oasis.adapters.webworker
```

### Starting Sandboxes

Web worker sandboxes will start immediately.  HTML (ie iframe) sandboxes will
start as soon as their DOM element is placed in the document.  The simplest way
to do this is to append them to the body:

```js
document.body.appendChild(sandbox.el);
```

But they can be placed anywhere in the DOM.  Please note that once in the DOM
the sandboxes should not be moved: iframes moved within documents are reloaded
by the browser.

## Connecting to Ports Directly

For simple applications it can be convenient to connect directly to ports for
a provided capability.

When doing so, you can send messages via `send`.  Messages can be sent in either
direction.
```js
  // in the environment
  sandbox.connect('account').then(function(port) {
    port.send('greeting', 'Hello World!')
  });

  // in the sandbox
  oasis.connect('account').then(function(port) {
    port.on('greeting', function (message) {
      document.body.innerHTML = '<strong>' + message + '</strong>';
    });
  });
```

You can also request data via `request` and respond to data via `onRequest`.
```js
  // in the environment
  sandbox.connect('account').then(function(port) {
    port.onRequest('profile', function () {
      return { name: 'Yehuda Katz' };
    })
  });

  // in the sandbox
  oasis.connect('account').then(function(port) {
    port.request('profile').then( function (name) {
      document.body.innerHTML = 'Hello ' + name;
    });
  });
```

You can also respond to requests with promises, in case you need to retrieve the
data asynchronously.  This example uses
[rsvp](http://github.com/tildeio/rsvp.js), but any
[Promises/A+](http://promises-aplus.github.com/promises-spec/) implementation is
supported.
```js
  // in the environment
  sandbox.connect('account').then(function(port) {
    port.onRequest('profile', function () {
      return new Oasis.RSVP.Promise( function (resolve, reject) {
        setTimeout( function () {
          // Here we're using `setTimeout`, but a more realistic case would
          // involve XMLHttpRequest, IndexedDB, FileSystem &c.
          resolve({ name: 'Yehuda Katz' });
        }, 1);
      });
    })
  });

  // in the sandbox
  oasis.connect('account').then(function(port) {
    // the sandbox code remains unchanged
    port.request('profile').then( function (name) {
      document.body.innerHTML = 'Hello ' + name;
    });
  });
```

## Using Services and Consumers

You can provide services for a sandbox's capabilities to take advantage of a
shorthand for specifying events and request handlers.

```js
  var AccountService = Oasis.Service.extend();
  var sandbox = oasis.createSandbox({
    url: 'http://example.com/profile_viewer.js',
    capabilities: [ 'account' ],
    services: {
      account: AccountService
    }
  });
```

This functionality is available within the sandbox as well: simply specify
consumers when connecting, rather than connecting to each port individually.

```js
var AccountConsumer = Oasis.Consumer.extend();
oasis.connect({
  consumers: {
    account: AccountConsumer
  }
})
```

Note that `Oasis.Service` and `Oasis.Consumer` are class-like, so we refer to
them via `Oasis`.  `oasis`, which we've been using for things like
`createSandbox`, is an instance of `Oasis` created automatically.  You normally
only need this implicit instance, but it's possible to have multiple groups of
sandboxes isolated from each other, although this is an advanced feature.

Services and Consumers can use an `events` shorthand for conveniently defining
event handlers:
```js
  var AccountService = Oasis.Service.extend({
    events: {
      updatedName: function(newName) {
        user.set('name', newName);
      }
    }
  });
```

They can also use a `requests` shorthand for easily defining request handlers.
```js
  var UserService = Oasis.Service.extend({
    requests: {
      basicInformation: function(user) {
        switch (user) {
          case 'wycats':
            return { name: 'Yehuda Katz' };
          case 'hjdivad':
            return { name: 'David J. Hamilton' };
        }
      },

      // The `requests` shorthand also supports asynchronous responses via
      // promises.
      extraInformation: function(user) {
        return new Oasis.RSVP.Promise( function (resolve, reject) {
          // if `loadExtraInformationAsynchronously` returned a promise we could
          // return it directly, as with jQuery's `ajax`.
          loadExtraInformationAsynchronously( function(userInformation) {
            resolve(userInformation);
          });
        });
      }
    }
  });
```

## Wiretapping Sandboxes

Sometimes it's helpful to listen to many, or even all, messages sent to or
received from, a sandbox.  This can be particularly useful in testing.

```js
  sandbox.wiretap( function(capability, message) {
    console.log(capability, message.type, message.data, message.direction);
  });
```

# Requirements & Browser Support

Oasis.js is designed to take advantage of current and upcoming features in
modern browsers.

- `<iframe sandbox>`: An HTML5 feature that allows strict sandboxing of content,
  even served on the same domain.  Available in all Evergreen browsers and
  IE10+.
- `MessageChannel`: An HTML5 feature that allows granular communication between
  iframes.  It replaces the need to do cumbersome multiplexing over a single
  `postMessage` channel.  Available in all Evergreen browsers (and IE10+) with
  the exception of Firefox.
- `postMessage` structured data: An HTML5 feature that allows sending structured
  data, not just strings, over `postMessage`.

Oasis.js supports Chrome, Firefox, Safari 6, and Internet Explorer 8+.  Support
for older browsers depends on polyfills.

- [MessageChannel.js](https://github.com/tildeio/MessageChannel.js) polyfills
  `MessageChannel` where it is unavailable (IE8, IE9 and Firefox).
- [Kamino.js](https://github.com/tildeio/kamino.js) polyfills `postMessage`
  structured data for Internet Explorer.

Support for IE8 and IE9 depends on the sandboxes being hosted on an origin that
differs from the environment, as these versions of IE do not support `<iframe
sandbox>`.  Oasis.js will refuse to create a sandbox if the sandbox attribute is
not supported and the domains are the same.

# Building Oasis.js

Make sure you have node and grunt installed.  Then, run:
```sh
npm install
grunt build
```

# Testing Oasis.js

To run the Oasis.js test, run:
```sh
grunt server
```

Then navigate to `http://localhost:8000`


# Samples

The easiest way to see the samples is to run the test server and navigate to
`http://localhost:8000/samples`.

# TODO

- OasisSandbox: don't call createChannels/connectPorts after init, but instead
  expose a hook
- Adapter.initialize: this should call the hook on [re]connect
- push; doc reconnection
  - `waitForLoad()` semantics in the face of reconnect?
    it's a promise, can only be fulfilled once, so it's a promise that the card
    has initialized & connected at least once;
    - don't save refs to ports or services, they can die at any moment (incl.
      mid-message)
  - `sandbox.connect('capability')` semantics sort of stay the same: basically
    you must call `connect` again in the face of reconnection.  How do you know
    to do this?  your port is stopped?
