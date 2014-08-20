export function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
}

var errorsHaveStacks = (function () {
  try {
    throw new Error("message");
  } catch (error) {
    return typeof error.stack === 'string';
  }
})();
