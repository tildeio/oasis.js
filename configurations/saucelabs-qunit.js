var exec = require('shelljs').exec;

var webkitBrowsers = [{
    browserName: 'chrome',
    version: '27',
    platform: 'Windows 8'
  }, {
    browserName: 'safari',
    version: '6',
    platform: 'OS X 10.8'
  }];

var ieBrowsers = [{
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
      platform: 'Windows XP'
  }];
  
var otherBrowsers = [{
    browserName: 'firefox',
    version: '21',
    platform: 'Windows 8'
  }];

var testTimeout = 3 * 60 * 1000,
    gitLabel = exec('git name-rev `git rev-parse HEAD`').output,
    travisBuildNumber = process.env.TRAVIS_BUILD_NUMBER || '',
    buildLabel = travisBuildNumber + " (" + gitLabel + ")";

module.exports = {
  options: {
    urls: [
      'http://localhost:8000/index.html'
    ],
    tunnelTimeout: testTimeout + (1 * 60 * 1000),
    build: buildLabel,
    concurrency: 3,
    testname: "Oasis.js qunit tests",
    testTimeout: testTimeout,
    testInterval: 5000
  },
  webkit: {
    options: {
      browsers: webkitBrowsers
    }
  },
  ie: {
    options: {
      browsers: ieBrowsers
    }
  },
  other: {
    options: {
      browsers: otherBrowsers
    }
  }
};
