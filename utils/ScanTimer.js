/**
 * @file ScanTimer.js
 * @author huangzongzhe
 */

module.exports = class ScanTimer {
    constructor(options) {
        this.callback = options.callback;
        this.timeInterval = options.interval;
        this.scanTimerTemp;
    }

    _initTimer() {
        this.scanTimerTemp = setTimeout(() => {
            this.callback(this.callbackArg1, this.callbackArg2);
            this.scanTimerTemp = null;
        }, this.timeInterval);
    }

    startTimer(arg1, arg2) {
        if (this.scanTimerTemp) {
            return;
        }
        this.callbackArg1 = arg1;
        this.callbackArg2 = arg2;
        this._initTimer();
    }
    restartTimer() {
        if (this.scanTimerTemp) {
            return;
        }
        this._initTimer();
    }

    holdTimer() {
        if (this.scanTimerTemp) {
            clearTimeout(this.scanTimerTemp);
            this.scanTimerTemp = null;
        }
        else {
            throw Error('No timer exist!');
        }
    }
};
