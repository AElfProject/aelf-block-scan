/**
 * @file utils.js
 * @author atom-yang
 * @date 2019-07-20
 */
const os = require('os');

function noImplementMethodError(methodName) {
  return `You should implement ${methodName} method`;
}

function noop() {}

function cpuInfo() {
  return os.cpus().reduce((acc, i) => {
    const {
      user,
      nice,
      sys,
      idle,
      irq
    } = i.times;
    const total = user + nice + sys + idle + irq + acc.total;
    return {
      total,
      idle: acc.idle + idle
    };
  }, {
    total: 0,
    idle: 0
  });
}

function cpuUsage(duration = 1000) {
  return new Promise((resolve, reject) => {
    try {
      const { total, idle } = cpuInfo();
      setTimeout(() => {
        const info = cpuInfo();
        const free = (info.idle - idle) / (info.total - total);
        resolve((1 - free) * 100);
      }, duration);
    } catch (e) {
      reject(e);
    }
  });
}

function usedMemoryRate() {
  return (1 - os.freemem() / os.totalmem()) * 100;
}

function bloomChecker(checker, bloom) {
  try {
    return checker(bloom);
  } catch (e) {
    console.error(e);
    return false;
  }
}

module.exports = {
  noImplementMethodError,
  noop,
  bloomChecker,
  cpuUsage,
  usedMemoryRate
};
