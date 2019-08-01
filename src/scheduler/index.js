/**
 * @file scheduler
 * @author atom-yang
 * @date 2019-07-20
 */
const utils = require('../common/utils');

const defaultOptions = {
  interval: 4000, // ms
  callback: utils.noop
};

class Scheduler {
  constructor(options = defaultOptions) {
    this.config = {
      ...defaultOptions,
      ...options
    };
    this.timerRef = null;
    this.paused = false;
    this.loopTimes = 0;
  }

  setInterval(interval) {
    this.config.interval = interval;
  }

  setCallback(callback) {
    this.config.callback = callback;
  }

  setTimer(interval) {
    this.timerRef = setTimeout(async () => {
      this.runnerTimeStart = new Date().getTime();
      if (!this.paused) {
        await this.config.callback(++this.loopTimes);
      }
      const runnerTimeUsed = new Date().getTime() - this.runnerTimeStart;
      let intervalLeft = this.config.interval - runnerTimeUsed;
      intervalLeft = intervalLeft < 0 ? 0 : intervalLeft;
      this.setTimer(intervalLeft);
    }, interval);
  }

  startTimer() {
    this.paused = false;
    if (this.timerRef) {
      return;
    }
    this.setTimer(this.config.interval);
  }

  pauseTimer() {
    if (this.timerRef) {
      this.pause = true;
    }
  }

  endTimer() {
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
  }
}

module.exports = Scheduler;
