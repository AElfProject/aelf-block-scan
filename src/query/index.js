/**
 * @file query
 * @author atom-yang
 * @date 2019-07-20
 */
const {
  bloomChecker
} = require('../common/utils');

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

  async queryBlocksAndTxsByBloom(height, blooms = []) {
    const blockInfo = await this.queryBlock(height);
    const {
      BlockHash,
      Header,
      Body
    } = blockInfo;
    const {
      Bloom
    } = Header;
    const {
      TransactionsCount
    } = Body;
    if (!Bloom) {
      return false;
    }
    const bloomsIn = blooms.filter(item => {
      const {
        checker
      } = item;
      return bloomChecker(checker, Bloom);
    });
    if (bloomsIn.length === 0) {
      return false;
    }
    blockInfo.scanTags = bloomsIn.map(v => v.tag);
    const transactions = await this.queryTransactions(BlockHash, TransactionsCount);
    const filteredTxs = transactions.map(tx => {
      const {
        Status,
        Bloom: txBloom
      } = tx;
      if (Status.toUpperCase() !== 'MINED' || !txBloom) {
        return false;
      }
      const tags = bloomsIn.filter(item => bloomChecker(item.checker, txBloom)).map(v => v.tag);
      return {
        ...tx,
        scanTags: tags
      };
    }).filter(tx => tx && tx.scanTags && tx.scanTags.length > 0);
    return {
      block: blockInfo,
      transactions: filteredTxs
    };
  }

  async chainStatus() {
    this.logger.info('get chain status in query');
    const status = await this.config.aelf.chain.getChainStatus();
    return status;
  }

  queryBlock(height, includeTx = false) {
    return this.config.aelf.chain.getBlockByHeight(height, includeTx);
  }

  async queryTransactions(blockHash, total) {
    const queryArray = this.getAllTransactionsByPageSize(
      total,
      blockHash,
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
    return transDetails;
  }

  async queryTransactionsByHeight(height) {
    this.logger.info(`start scan block transactions at height ${height}`);
    const blockInfo = await this.queryBlock(height);
    const {
      BlockHash
    } = blockInfo;
    const { TransactionsCount } = blockInfo.Body;
    if (TransactionsCount > 0) {
      const transactions = await this.queryTransactions(BlockHash, TransactionsCount);
      return {
        blockInfo,
        transactions
      };
    }
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
