function State () {
  this.packages = {};
  this.requestId = 0;
  this.oasisId = 'oasis' + (+new Date());
};

State.prototype.reset = function () {
  this.packages = {};
  this.requestId = 0;
  this.oasisId = 'oasis' + (+new Date());
}

export = new State;
