module("Oasis.js");

test("The configuration does not have a default `oasisURL`", function() {
  var oasis = new Oasis();

  ok( !oasis.configuration.oasisURL, "No default URL");
});
