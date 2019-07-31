/**
 * @file index.js
 * @author atom-yang
 * @date 2019-07-20
 */
const AElf = require('aelf-sdk');
const log4js = require('log4js');
const constants = require('./common/constants');
const Query = require('./query/index');
const Scheduler = require('./scheduler/index');
const DBBaseOperation = require('./dbOperation/index');

const defaultOptions = {
  // when chase up to last irreversible block height, start query in loop with this interval
  interval: 4000, // ms
  // the size of transactions per query
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
  // max insert Data
  maxInsert: 200,
  // unconfirmed block buffer
  unconfirmedBlockBuffer: 60,
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
};

class Scanner {
  constructor(dbOperator, options = defaultOptions) {
    this.config = {};
    this.makeConfig(dbOperator, options);
  }

  makeConfig(dbOperator, options) {
    this.currentPhase = constants.QUERY_TYPE.INIT;
    this.config = {
      ...defaultOptions,
      ...this.config,
      ...options
    };
    log4js.configure(this.config.log4Config);
    this.log4Trans = log4js.getLogger('transaction');
    this.log4Common = log4js.getLogger();
    this.config.actualConcurrentQueryLimit = this.config.concurrentQueryLimit;
    this.query = new Query({
      pageSize: this.config.txResultsPageSize,
      transLimit: this.config.concurrentQueryLimit,
      aelf: this.config.aelfInstance
    }, this.log4Trans);
    this.scheduler = new Scheduler({
      interval: this.config.interval
    });
    if (!(dbOperator instanceof DBBaseOperation)) {
      throw new Error('You should give an instance of DBBaseOperation sub-class');
    }
    this.dbOperator = dbOperator;
    this.currentQueries = this.config.startHeight;
    this.loopTimes = 0;
  }

  scanPhase() {
    return this.currentPhase;
  }

  restart(dbOperator, options) {
    this.log4Common.info('restart scan');
    this.makeConfig(dbOperator, options);
    this.start();
  }

  async start() {
    this.log4Common.info('start scan');
    try {
      await this.dbOperator.init();
      this.currentPhase = constants.QUERY_TYPE.MISSING;
      await this.queryMissingHeight();
      this.currentPhase = constants.QUERY_TYPE.GAP;
      await this.queryGapHeight();
      this.currentPhase = constants.QUERY_TYPE.LOOP;
      await this.queryInLoop();
    } catch (e) {
      this.log4Common.error(e);
      this.log4Common.info('scan is shutdown due to error in program, you can restart scan or trace the error');
      this.currentPhase = constants.QUERY_TYPE.ERROR;
      this.scheduler.endTimer();
      this.dbOperator.destroy();
      throw e;
    }
  }

  async queryMissingHeight() {
    console.time(constants.QUERY_TYPE.MISSING);
    this.log4Common.info('start scan missing heights');
    const missingResults = await this.queryBlockAndTxs(this.config.missingHeightList, constants.QUERY_TYPE.MISSING);
    this.log4Common.info('end scan missing heights');
    this.log4Common.info('call insert hook');
    await this.dbOperator.insert(missingResults);
    this.log4Common.info('insert hook end');
    console.timeEnd(constants.QUERY_TYPE.MISSING);
  }

  async queryGapHeight() {
    console.time(constants.QUERY_TYPE.GAP);
    this.log4Common.info('start query gap heights');
    const { LIBHeight, height: bestHeight } = await this.getHeight();
    // leave height gap for buffer
    let currentHeight = LIBHeight;
    if (currentHeight <= this.config.startHeight) {
      return;
    }
    let leftHeights = currentHeight - this.config.startHeight;
    for (let i = 0; i <= leftHeights; i += this.config.maxInsert) {
      const maxInsertHeights = new Array(this.config.maxInsert).fill(1)
        .map((value, index) => this.config.startHeight + i + index)
        // eslint-disable-next-line no-loop-func
        .filter(v => v <= currentHeight);
      // eslint-disable-next-line no-await-in-loop
      const maxInsertResults = await this.queryBlockAndTxs(maxInsertHeights, constants.QUERY_TYPE.GAP);
      maxInsertResults.LIBHeight = currentHeight;
      maxInsertResults.bestHeight = bestHeight;
      // eslint-disable-next-line no-await-in-loop
      await this.dbOperator.insert(maxInsertResults);
      // eslint-disable-next-line no-await-in-loop
      currentHeight = (await this.getHeight()).LIBHeight;
      leftHeights = currentHeight - this.config.startHeight;
    }
    this.currentQueries = currentHeight;
    console.timeEnd(constants.QUERY_TYPE.GAP);
  }

  async queryInLoop() {
    this.log4Common.info('start loop');
    this.scheduler.setCallback(async () => {
      this.loopTimes++;
      this.log4Common.info(`start loop for ${this.loopTimes} time`);
      const {
        height: currentHeight,
        LIBHeight
      } = await this.getHeight();
      const heightsLength = currentHeight - this.currentQueries || 0;
      // eslint-disable-next-line max-len
      const heights = new Array(heightsLength < 0 ? 0 : heightsLength).fill(1).map((_, index) => this.currentQueries + index + 1);
      const loopHeightsResult = await this.queryBlockAndTxs(heights, constants.QUERY_TYPE.LOOP);
      loopHeightsResult.LIBHeight = LIBHeight;
      loopHeightsResult.bestHeight = currentHeight;
      await this.dbOperator.insert(loopHeightsResult);
      this.currentQueries = LIBHeight;
      this.log4Common.info(`end loop for ${this.loopTimes} time`);
    });
    this.scheduler.startTimer();
  }

  async getHeight() {
    this.log4Common.info('get height');
    const status = await this.query.chainStatus();
    this.log4Common
      .info(`get best height ${status.BestChainHeight}, get LIB height ${status.LastIrreversibleBlockHeight}`);
    return {
      height: parseInt(status.BestChainHeight, 10),
      LIBHeight: parseInt(status.LastIrreversibleBlockHeight, 10)
    };
  }

  /**
   * return block information and transaction results
   * @param {Number[]} heights the array of heights
   * @param {string} type the type of query
   * @return {Promise<{blocks: *, txs: *}>}
   */
  async queryBlockAndTxs(heights = [], type = 'loop') {
    const results = [];
    this.log4Common.info(`start query block in parallel ${this.config.concurrentQueryLimit}`);
    for (let i = 0; i < heights.length; i += this.config.concurrentQueryLimit) {
      this.log4Common.info(`start query block in parallel ${this.config.concurrentQueryLimit} for the ${i} time`);
      const heightsLimited = heights.slice(i, i + this.config.concurrentQueryLimit);
      // eslint-disable-next-line no-await-in-loop
      const txs = await Promise.all(heightsLimited.map(v => this.query.queryTransactionsByHeight(v)));
      this.log4Common.info(`end query block in parallel ${this.config.concurrentQueryLimit} for the ${i} time`);
      results.push(txs);
    }
    this.log4Common.info(`end query block in parallel ${this.config.concurrentQueryLimit}`);
    const txs = [];
    const blocks = [];
    results.reduce((acc, i) => acc.concat(i), []).forEach(({ blockInfo, transactions }) => {
      txs.push(transactions);
      blocks.push(blockInfo);
    });
    return {
      blocks,
      txs,
      type
    };
  }
}

module.exports = {
  Scanner,
  DBBaseOperation,
  QUERY_TYPE: constants.QUERY_TYPE
};
