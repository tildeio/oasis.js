### 0.2.0

#### Breaking Changes

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

### 0.1.0 / 9 July 2013

Initial version.
