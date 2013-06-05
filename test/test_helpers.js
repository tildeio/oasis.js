function getBase () {
  var link = document.createElement("a");
  link.href = "!";
  var base = link.href.slice(0, -1);

  return base;
}
