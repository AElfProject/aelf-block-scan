# AElf Block Scan

A tool to scan the AElf Chain.
* You can use this library to scan the specific AElf node and get the blocks and transactions in blocks.
* By implementing the `DBBaseOperation` class, you can get the data in `insert` hook and implement the SQL operations with anything you want.

## Installation

```bash
# use npm
npm i aelf-block-scan --save

# use yarn
yarn aelf-block-scan
```

## Usage

Check the `example/index.js` as a reference in [ the repo of aelf-block-scan](https://github.com/AElfProject/aelf-block-scan).

### Step.1

Create an AElf instance
```javascript
const AElf = require('aelf-sdk');
const aelf = new AElf(new AElf.providers.HttpProvider('http://18.162.41.20:8000'));
```

### Step.2

Implement the `DBBaseOperation` class.

There are three phases while scanning, and all phases can be identified by the `type` filed in `insert` function argument `data`
* Phase.1: scanning the `missingHeights` given by the `config`;
* Phase.2: scanning blocks and transactions from `startHeight` to `LIBHeight`;
* Phase.3: scanning in loop, from the last `LIBHeight` got from previous loop to current `bestHeight` in current loop.

In all phases, query blocks and transactions with a maximal concurrent limit.

There are three methods that must be implemented in sub-class of `DBBaseOperation`

* `init`: will be called before scanning, this method could include database initializing
* `insert`: called when the length of blocks already queried is equal to the `maxInsert` given in `options`, the argument `data`
is an object and contains three fields:
    * blocks: the array of blocks
    * txs: the array of transactions array, each element in `txs` is correspond to the block in `blocks` with the same `index`
    * LIBHeight: the current LIBHeight of chain (unavailable in `Phase.1`)
    * bestHeight: the current bestHeight of chain (unavailable in `Phase.1`)
* `destory`: called when error happening or exiting from the scanning process, you can close the database connection

***Notice***:
1. Notice that we query all the blocks and transactions inside blocks, and it increases the pressure of chain node.
    However we don't need all blocks and transactions for most of time, so we provide a new scan mode called `listener`
    which can get the blocks and transactions you are interested in by bloom filter. With bloom filter, you can judge whether an
    event is in a block or transaction, with this, `aelf-block-scan` can give only what you are interested in.
2. And how to use this, you only need to set the config `scanMode` to the value of `listener` and create a new array `listeners` in
   the config. Check the example [listener.js](./example/listeners.js) for more detail.



```javascript
const {
  Scanner,
  DBBaseOperation,
  QUERY_TYPE
} = require('aelf-block-scan');

class DBOperation extends DBBaseOperation {
  constructor(config) {
    super(config);
    this.lastTime = new Date().getTime();
  }

  /**
   * init before starting scanning
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
    // identify the phase
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
```

### Step.3

Create an instance of Scanner and call `start` method

`const scanner = new Scanner(new DBOperation(), options)`;

the `options` argument is an object, the default options and valid fields are shown below:

```javascript
const defaultOptions = {
  // in Phase.3, the timeout of each loop
  // when chase up to last irreversible block height, start query in loop with this interval
  interval: 4000, // ms
  // the size of transactions per query in `aelf.chain.getTxResults`
  txResultsPageSize: 100,
  // max queries in parallel
  concurrentQueryLimit: 40,
  // query from this height, include this height
  startHeight: 0,
  // If the differences between startHeight and last irreversible block height
  // is lower than heightGap, start loop just now
  // heightGap: 50,
  // missing height list, the heights you want to query and insert
  missingHeightList: [],
  // the instance of aelf-sdk
  aelfInstance: new AElf(new AElf.providers.HttpProvider('http:127.0.0.1:8000/')),
  // max inserted Data into database
  maxInsert: 200,
  // unconfirmed block buffer
  unconfirmedBlockBuffer: 60,
  // config for log4js
  log4Config: {
    appenders: {
      transaction: {
        type: 'file',
        filename: 'transaction.log'
      },
      block: {
        type: 'file',
        filename: 'block.log'
      },
      error: {
        type: 'file',
        filename: 'error.log'
      }
    },
    categories: {
      default: { appenders: ['transaction', 'block', 'error'], level: 'info' },
      transaction: { appenders: ['transaction'], level: 'info' },
      block: { appenders: ['block'], level: 'info' }
    }
  }
}
```

Example:

```javascript
const {
  Scanner,
  DBBaseOperation,
  QUERY_TYPE
} = require('aelf-sdk');

const scanner = new Scanner(new DBOperation(), {
  aelfInstance: aelf,
  startHeight: 11000,
  missingHeightList: [12, 1414],
  interval: 8000,
  concurrentQueryLimit: 30,
  maxInsert: 100
});
scanner.start().then(res => {
  // here we just start Phase.3 loop
  console.log(res);
}).catch(err => {
  console.log(err);
});
```

