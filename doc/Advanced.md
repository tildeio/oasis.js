# Inline Adapter

It is possible to create inline sandboxes, ie oases that exist within the same
window that are not sandboxed behind an iframe or web worker.  This can be a
performance improvement in cases with some set of known trusted “sandboxes”
mixed with other sandboxes.

However it should be considered experimental and very advanced.  Although the
API remains the same, there are additional constraints that make this feature
easy to misuse.

Here is how you might load an inline sandbox.
```js
var PeopleService = Oasis.Service.extend();
var sandbox = oasis.createSandbox({
  url: 'inline-sandbox.js',
  adapter: Oasis.adapters.inline,
  capabilities: ['people'],
  services: {
    people: PeopleService
  }
});
```

**Please Note**: This is an experimental API and likely to change.

## Additional Constraints

### Shared DOM

Normally a sandbox can safely access `document.body`, `document.head` and so on.
Inline sandboxes need to be more judicious with their DOM changes.

### Shared Execution Context

Normally sandboxes do not need to worry about polluting the global namespace, or
overriding prototypes.  Inline sandboxes need to be written more like libraries.

#### Global Oasis Object

Sandboxes typically connect by calling `oasis.connect`, ie via the global
`oasis` object.  The sandboxed `oasis` is normally the global `oasis` object
within the frame's execution context.

Inline sandboxes are instead executed as a function body, with the `oasis`
object passed as a parameter.  This means inline sandboxes must be more careful
about referencing `oasis`.

The following would connect correctly:
```js
var PersonConsumer = Oasis.Consumer.extend();
oasis.connect({
  consumers: {
    person: PersonConsumer
  }
});
```

But changing scope would result in the wrong `oasis` object being referenced.
```js
function setupOasis() {
  var PersonConsumer = Oasis.Consumer.extend();
  oasis.connect({
    consumers: {
      person: PersonConsumer
    }
  });
}

setupOasis();
```
