/**
 * @file example
 * @author atom-yang
 * @date 2019-07-23
 */
const AElf = require('aelf-sdk');
const {
  Scanner,
  DBBaseOperation,
  QUERY_TYPE
} = require('../src/index');

// get an AElf instance
const aelf = new AElf(new AElf.providers.HttpProvider('http://18.162.41.20:8000'));

class DBOperation extends DBBaseOperation {
  constructor(config) {
    super(config);
    this.lastTime = new Date().getTime();
  }

  /**
   * init before start scanning
   */
  init() {
    console.log('init');
  }

  /**
   * will be called in every parallel scanning, could be defined as an async functions.
   * each element in `txs` is an array of transactions
   * each element in `txs` is correspond to the block in `blocks` with the same `index`
   * @param {{blocks: [], txs: [], LIBHeight: Number, bestHeight: Number}} data
   */
  async insert(data) {
    const now = new Date().getTime();
    console.log(`take time ${now - this.lastTime}ms`);
    this.lastTime = now;
    const {
      blocks,
      txs,
      type,
      bestHeight,
      LIBHeight
    } = data;
    switch (type) {
      case QUERY_TYPE.INIT:
        console.log('INIT');
        break;
      case QUERY_TYPE.MISSING:
        // there is no LIBHeight and bestHeight in data when querying missing heights
        console.log('MISSING');
        break;
      case QUERY_TYPE.GAP:
        console.log('GAP');
        console.log('LIBHeight', LIBHeight);
        break;
      case QUERY_TYPE.LOOP:
        console.log('LOOP');
        console.log('bestHeight', bestHeight);
        console.log('LIBHeight', LIBHeight);
        break;
      case QUERY_TYPE.ERROR:
        console.log('ERROR');
        break;
      default:
        break;
    }
    console.log('blocks length', blocks.length);
    console.log('transactions length', txs.reduce((acc, i) => acc.concat(i), []).length);
    if (blocks.length > 0) {
      console.log('highest height', blocks[blocks.length - 1].Header.Height);
    }
    console.log('\n\n\n');
  }

  /**
   * close sql connection or something
   */
  destroy() {
    console.log('destroy');
  }
}

const scanner = new Scanner(new DBOperation(), {
  aelfInstance: aelf,
  startHeight: 11000,
  interval: 8000
});
scanner.start().then(res => {
  console.log(res);
}).catch(err => {
  console.log(err);
});
