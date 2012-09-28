# Oasis.js

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
    <script src="http://example.com/oasis-environment.js"></script>
  </head>
  <body>
    <script>
      var profileService = {
        sandboxLoaded: function(port) {
          port.receive('profile', function(promise) {
            promise.resolve({ email: 'wycats@gmail.com' });
          }
        }
      }

      var sandbox = Oasis.createSandbox({
        url: 'http://example.com/profile_viewer.html',
        services: { profile: profileService }
      });

      document.body.appendChild(sandbox);
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
    <script src="http://example.com/oasis-sandbox.js"></script>
  </head>
  <body>
    <div>
      <p>Email: <span id="email"><img src="loading.png"></span></p>
    </div>
    <script>
      Oasis.registerHandler('profile', {
        setupCapability: function(port) {
          port.request('profile').then(function(profile) {
            $("#email").html(profile.email);
          });
        }
      });
    </script>
  </body>
</html>
```

# Features

Oasis uses the web's sandboxing mechanism to isolate untrusted code from
an application.

Using the Oasis API, you can expose capabilities that allow the sandboxed
code and your application to communicate in a predictable and secure way.

You can send a message from your application to the sandbox:

```javascript
var service = {
  sandboxLoaded: function(port) {
    port.send('person', {
      firstName: "Tom",
      lastName: "Dale"
    });
  }
};
```

You can send a message from the sandbox to the application:

```javascript
Oasis.registerHandler('person', {
  setupCapability: function(port) {
    port.send('updatePerson', {
      firstName: "Scumbag",
      lastName: "Dale"
    });
  }
});
```

You can also request information that the other side of the channel can resolve asynchronously:

```javascript
// application
var service = {
  sandboxLoaded: function(port) {
    port.receive('data', function(promise) {
      promise.resolve({
        firstName: "Tom",
        lastName: "Dale"
      });
    });
  }
};

// sandbox
Oasis.registerHandler('data', {
  setupCapability: function(port) {
    port.request('data').then(function(data) {
      var html = personTemplate(data);
      document.body.innerHTML = html;
    });
  }
});
```

Oasis aims to streamline the process for communicating with sandboxed
code. As the web platform's support for sandboxed code continues to mature,
Oasis will provide a consistent interface that takes advantage of native
platform support. We will also extend a large subset of those features
to older browsers using the same interface.

While Oasis will eventually support browsers as old as IE8, we will not
support older browsers without `postMessage` support.

# Requirements

Oasis.js is designed to take advantage of current and upcoming features
in modern browsers.

* `<iframe sandbox>`: An HTML5 feature that allows strict sandboxing of
  content, even served on the same domain. Available in all Evergreen
  browsers and IE10+.
* `<iframe seamless>`: An HTML5 feature that allows embedding resizable
  content in a page, as well as inheriting CSS styles from its
  environment. This is not strictly required, but Oasis does not yet
  provide any resizing support for embedded content. This feature is
  not yet in any stable browser.
* `MessageChannel`: An HTML5 feature that allows granular communication
  between iframes. It replaces the need to do cumbersome multiplexing
  over a single `postMessage` channel. Available in all Evergreen
  browsers (and IE10+) with the notable exception of Firefox.
* `postMessage` structured data: An HTML5 feature that allows sending
  structured data, not just strings, over `postMessage`

Moving forward, we plan to minimally polyfill these features so that
Oasis can be used in older browsers.

For resizing, we plan to provide a built-in service that sandboxes can
use to communicate their appropriate size for browsers that do not
support seamless iframes.

For `MessageChannel`, we plan to provide a minimal polyfill based on
multiplexing `postMessage`.

For `<iframe sandbox>`, we plan to provide a way to use generated
subdomains to sandbox content. *Note that sandboxes are not required for
content already hosted on a separate domain from the containing
environment.*

For structured data, we plan to use the existing `postMessage` API but
serialize and deserialize the structured data. 

You should expect Oasis to gain support for IE8+, Safari 6, stable
Firefox, stable Chrome, and stable Opera in the future.
