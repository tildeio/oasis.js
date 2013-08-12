import { configuration } from "oasis/config";

function State () {
  this.reset();
}

State.prototype.reset = function () {
  this.packages = {};
  this.requestId = 0;
  this.oasisId = 'oasis' + (+new Date());

  this.consumers = {};
  this.services = [];

  configuration.eventCallback = function (callback) { callback(); };
};

export default new State();
