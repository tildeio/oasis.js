### next

- Adapters can have unsupported capabilities.  These are capabilities the
  adapter will never connect, even when they are registered for a sandbox.  This
  can be useful if you have capabilities that never make sense in, for example,
  a webworker adapter, and want an easy way to disable the capability for all
  sandboxes so loaded.
- Adapters are exported as types instead of instances.  `Oasis.adapters` still
  contains instances.
- Example:
    ```js
    import { extend } from "oasis/util";
    import IframeAdapter from "oasis/iframe_adapter";
    
    var MyRestrictedIframeAdapter = extend(IframeAdapter),
        myRestrictedIframeAdapter = new MyRestrictedIframeAdapter();
    
    myRestrictedIframeAdapter.addUnsupportedCapability('someCapability');
    
    // This sandbox will have 'a', 'b' and 'c' capabilities, but not
    // 'someCapability'
    oasis.createSandbox({
      adapter: myRestrictedIframeAdapter,
      capabilities: ['a', 'b', 'c', 'someCapability']
      /* ... */
    });
    ```

### 0.3.0

- `oasis.logger.enable()` will log some Oasis internals, especially around
  sandbox initialization.  Specific output and output format subject to change.

#### Breaking Changes

- `sandbox.promise` changed to `sandbox.waitForLoad()`.
- `Oasis` global renamed to `oasis`.  This is part of a larger change that
  allows multiple `Oasis` instances to coexist, which will help support an
  inline adapter for trusted environments.

### 0.2.1

- HTML sandboxes are supported again.

### 0.2.0

- Ports are saved on sandboxes.
```js
  sandbox.promise.then(function () {
    // This only works for non-transfered ports
    sandbox.capabilities.someCapability.send('something');
  });
```
- Users may supply wrappers around event handlers via `Oasis.configure`.  The
  default wrapper simply invokes the callback directly.
```js
Oasis.configure('eventHandler', function (callback) { callback(); });
```

#### Breaking Changes

- Request handlers may not directly return literal `undefined` values.  Such
  return values are treated as errors to catch the common case of accidentally
  failing to return a promise for asynchronous requests.  If you actually want
  to return a literal `undefined` in a request handler do the following:
  ```js
    return RSVP.resolve(undefined);
  ```
- Request handlers are no longer passed a resolver.  Instead they may return
  values directly or return promises if the values need to be retrieved
  asynchronously.  Returned promises may reject, which will cause promise
  rejection to the corresponding service or consumer.

#### Experimental APIs

- Request handlers may throw errors to indicate values could not be returned.
  The message and stack of any error thrown will be passed to the rejection
  handler of the corresponding promise in a simple object.

  Example:
    ```js
    // environment
    port.request('data').then(
      function(data) { /* ... */ },
      function(error) {
        console.error(error.message);
        console.log(error.stack);
      });

    // sandbox
    requests: {
      data: {
        if (throwString) {
          throw "error message";
        } else if (throwError) {
          // this case is most useful to simply propagate errors thrown by
          // third-party code.
          throw new Error("error message");
        }
      }
    }
    ```

### 0.1.0
*9 July 2013*

Initial version.
