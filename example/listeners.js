/**
 * @file example with listeners
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

process.on('unhandledRejection', err => {
  console.log('unhandledRejection');
  console.error(err);
});

const tokenTag = 'tokenTransfer';
const organizationTag = 'organizationCreated';

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
      results,
      type,
      bestHeight,
      LIBHeight
    } = data;
    console.log(data);
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
    const tokenRelatedBlocksAndTx = results[tokenTag];
    const organizationRelated = results[organizationTag];
    const {
      blocks: tokenBlocks
    } = tokenRelatedBlocksAndTx;
    tokenBlocks.forEach(block => {
      const {
        scanTags,
        transactionList
      } = block;
      // eslint-disable-next-line max-len
      console.log(`Block ${block.BlockHash} has tags ${JSON.stringify(scanTags)} with transactions ${transactionList.map(v => v.TransactionId)}\n\n`);
    });
    const {
      blocks: organizationBlocks
    } = organizationRelated;
    organizationBlocks.forEach(block => {
      const {
        scanTags,
        transactionList
      } = block;
      // eslint-disable-next-line max-len
      console.log(`Block ${block.BlockHash} has tags ${JSON.stringify(scanTags)} with transactions ${transactionList.map(v => v.TransactionId)}\n\n`);
    });
    console.log(results);
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
  startHeight: 720,
  interval: 8000,
  scanMode: 'listener',
  listeners: [
    {
      checker(bloom) {
        // address in the contract address, query when initializing scanning.
        return AElf.utils.isEventInBloom(bloom, 'Transferred')
          && AElf.utils.isAddressInBloom(bloom, '25CecrU94dmMdbhC3LWMKxtoaL4Wv8PChGvVJM6PxkHAyvXEhB');
      },
      tag: tokenTag
    },
    {
      checker(bloom) {
        return AElf.utils.isEventInBloom(bloom, 'OrganizationCreated');
      },
      tag: organizationTag
    }
  ]
});
scanner.start().then(res => {
  console.log(res);
}).catch(err => {
  console.error(err);
});
