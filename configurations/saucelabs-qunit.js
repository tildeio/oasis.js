var browsers = [{
    browserName: 'chrome',
    version: '27',
    platform: 'Windows 8'
  },{
    browserName: 'firefox',
    version: '21',
    platform: 'Windows 8'
  },{
    browserName: 'safari',
    version: '6',
    platform: 'OS X 10.8'
  },{
    browserName: 'internet explorer',
    version: '10',
    platform: 'Windows 8'
  },{
    browserName: 'internet explorer',
    version: '9',
    platform: 'Windows 7'
  },{
    browserName: 'internet explorer',
    version: '8',
    platform: 'Windows 7'
  }];

var testTimeout = 3 * 60 * 1000;

module.exports = {
  all: {
    options: {
      urls: [
        'http://localhost:8000/index.html'
      ],
      tunnelTimeout: testTimeout + (1 * 60 * 1000),
      build: process.env.TRAVIS_BUILD_NUMBER,
      concurrency: 3,
      browsers: browsers,
      testname: "Oasis.js qunit tests",
      testTimeout: testTimeout,
      testInterval: 5000
    }
  }
};