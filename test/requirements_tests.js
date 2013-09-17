module('Requirements');

test("Assert not file://", function() {
  expect(1);
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});
