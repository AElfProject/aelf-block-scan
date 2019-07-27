/**
 * @file query
 * @author atom-yang
 * @date 2019-07-20
 */
const defaultPageSize = 100;
const defaultOptions = {
  pageSize: defaultPageSize
};

class Query {
  constructor(options = defaultOptions, logger) {
    this.config = {
      ...defaultOptions,
      ...options
    };
    this.logger = logger;
  }

  async chainStatus() {
    this.logger.info('get chain status in query');
    const status = await this.config.aelf.chain.getChainStatus();
    return status;
  }

  async queryTransactionsByHeight(height) {
    this.logger.info(`start scan block transactions at height ${height}`);
    console.time(`transaction ${height}`);
    const blockInfo = await this.config.aelf.chain.getBlockByHeight(height, true);
    const { Transactions: transactions } = blockInfo.Body;
    if (transactions.length > 0) {
      // this.logger.info('get block transactions');
      const queryArray = this.getAllTransactionsByPageSize(
        transactions.length,
        blockInfo.BlockHash,
        this.config.pageSize
      );
      let transDetails = [];
      for (let i = 0; i < queryArray.length; i += this.config.transLimit) {
        const txParams = queryArray.slice(i, i + this.config.transLimit);
        // eslint-disable-next-line no-await-in-loop
        const txs = await Promise.all(txParams.map(param => this.config.aelf.chain.getTxResults(...param)));
        transDetails.push(txs.reduce((acc, v) => acc.concat(v), []));
      }
      transDetails = transDetails.reduce((acc, i) => acc.concat(i), []);
      return {
        blockInfo,
        transactions: transDetails
      };
    }
    console.timeEnd(`transaction ${height}`);
    return {
      blockInfo,
      transactions: []
    };
  }

  getAllTransactionsByPageSize(
    allTransactionsLength,
    blockHash,
    pageSize = defaultPageSize
  ) {
    const queryArray = [];
    for (let offset = 0; offset < allTransactionsLength; offset += pageSize) {
      queryArray.push([
        blockHash,
        offset,
        pageSize
      ]);
    }
    return queryArray;
  }
}

module.exports = Query;
