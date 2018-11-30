/*
 * huangzongzhe
 * 2018.08
 */

// TODO
// 1. 目前我的电脑大概每1~2秒处理100个块，2.8 GHz Intel Core i7， 16 GB 2133 MHz LPDDR3  待优化。
// 2. 优化过程中，两个insert的 事务操作需要补充完毕。
// 3. 需要增加检查, 每隔一段时间，或者多少次循环后，需要check一次是否有未入库的块。
// 4. let blockList = await connection.query('select block_height from blocks_0', []); 需要优化，当区块数到百万千万级别时，如何分页处理。

let config = require('./config/configInit.js').config;
const Aelf = require('aelf-sdk');
const log4js = require('log4js');

const initAcquisition = require('./tps/initTpsAcquisition');
let initAcquisitionReady = false;

const { blockInfoFormat, transactionFormat } = require('./lib/format.js');
const { insertTransactions, insertBlock } = require('./lib/insertPure.js');
const missingList = require('./lib/missingList');

const { queryPromise } = require('./lib/mysql/queryPromise');
const { getConnectionPromise } = require('./lib/mysql/getConnectionPromise');
const { beginTransaction } = require('./lib/mysql/beginTransaction');

const mysql = require('mysql');

log4js.configure(config.log4js);
const logger = log4js.getLogger('scan');

let aelf = new Aelf(new Aelf.providers.HttpProvider(config.aelf.network));
const scanLimit = config.scanLimit;
const scanTimeInterval = config.scanTimeInterval;

// 这个，然后再套上PM2...
// http://nodejs.cn/api/process.html#process_event_uncaughtexception
// 官方并不建议当做 On Error Resume Next的机制。
let restartTime = 0;
process.on('uncaughtException', (err) => {
    if (!err.toString().match('Invalid JSON RPC response')) {
        return;
    }
    // 针对这个error重启
    // Error: Invalid JSON RPC response: undefined
    restart(err);
});

function restart(err, info = '') {
    logger.error(`Err: ${err}, ExtraInfo: ${info}`);
    console.log('捕获到异常, 1分钟后重启: ', err);
    restartTime++;
    setTimeout(() => {
        logger.error(`第 ${restartTime} 次重启中》》》》》》》》》》`)
        init();
    }, 1000 * 60 * 1);
}

init();

function init() {
    initAcquisitionReady = false;
    aelf.chain.connectChain(err => {
        if (err) {
            logger.error('aelf.chain.connectChain err: ', err);
        }

        const aelfPool = mysql.createPool(config.mysql.aelf0);
        startScan(aelfPool, scanLimit);

    });
}

// 统计用
let scanTime = 0;
// 只重启三次
let reStartScan = 0;
async function startScan(pool, scanLimit) {
    // 供测试使用，我的mbp, 13次/s, cpu占用率特别高。
    // setInterval(function () {
    //     console.log('11111');
    //     aelf.chain.getTxResult('0x5c5d001bd72f6f8d939a1203fcaa686bdcbc2b027a79b05de8e49e529c5b97a7', (error, result) => {
    //     });
    // }, 75);

    let blockList = await queryPromise(pool, 'select block_height from blocks_0', []);

    // let list = missingList.getBlockMissingList([{block_height: 100}]);
    // TODO: missingList不能超过sql的连接池上线，否则需要分批。
    // 其实是机器可能扛不住，资源占用过高。
    let list = missingList.getBlockMissingList(blockList);

    console.log('missingList: ', list);

    let startTime = new Date().getTime();
    let scanMissingBlocksPromises = list.list.map(item => {
        return scanABlock(item, pool);
    });

    Promise.all(scanMissingBlocksPromises).then(async () => {
        let endTime = new Date().getTime();
        console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);

        let blockList = await queryPromise(pool, 'select block_height from blocks_0', []);
        let list = missingList.getBlockMissingList(blockList);
        console.log('list.length: ', list.length);
        if (list.length && reStartScan < 3) {
            reStartScan++;
            console.log('missingList: ', list);
            startScan(pool, scanLimit);
            return;
        } else if (reStartScan >= 3) {
            logger.error('!!!!!!!! re start scan > 3');
        }

        // 确认没有丢失的块后，开始扫描数据入库。
        subscribe(pool, scanLimit);
    }).catch(err => {
        console.log('preScan - 理论上这一些promises是没有err的: ', err);
        console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);
    });
}

// 获取一个区块的数据，并将数据插入数据库中，用一个事务来操作。
// 先获取区块信息，然后获取所有交易信息。 
// 使用一个连接，插入数据库，失败一条即回滚。
let scanABlock = function(listIndex, pool) {
    return new Promise((resolve, reject) => {
        let startTime = new Date().getTime();

        aelf.chain.getBlockInfo(listIndex, true, async (err, result) => {
            if (err || !result) {
                resolve({
                    code: 10000,
                    errType: 'chainError, getBlockInfo',
                    err: err,
                    result: result
                });
                return;
            }

            try {
                let blockInfo = result.result;
                let transactions = blockInfo.Body.Transactions;
                let blockInfoFormatted  = blockInfoFormat(blockInfo);

                let txLength = transactions.length;

                // console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex, txLength);

                let transactionsDetail = [];

                if (txLength) {
                    let transactionPromises = [];

                    // Get transactionPromises
                    for (let i = 0; i < txLength; i++) {
                        transactionPromises.push(new Promise((resolve, reject) => {
                            aelf.chain.getTxResult(transactions[i], (error, result) => {

                                if (error || !result) {
                                    console.log('error result getTxResult: ', listIndex, result, error);
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            });
                        }));
                    }

                    // 并发请求该块中所有交易。并插入数据库。
                    // TODO: rpc接口 有批量获取交易的接口了。
                    Promise.all(transactionPromises).then(async (result) => {

                        let endTime = new Date().getTime();
                        scanTime += endTime - startTime;

                        transactionsDetail = result.map(item => {
                            return transactionFormat(item.result, blockInfoFormatted);
                        });

                        let connection = await getConnectionPromise(pool);

                        beginTransaction(connection);

                        let insertTranPromise = insertTransactions(transactionsDetail, connection, 'transactions_0');
                        let insertBlockPromise = insertBlock(blockInfoFormatted, connection, 'blocks_0');
                        
                        Promise.all([insertTranPromise, insertBlockPromise]).then(() => {
                            connection.commit(err => {
                                if (err) {
                                    console.log('connection.commit rollback!');
                                    connection.rollback(function() {
                                        connection.release();
                                        logger.error('[insertTranPromise, insertBlockPromise]Promise.all then rollback: ', err);
                                        // throw err;
                                    });
                                }
                                connection.release();
                            });

                        }).catch(err => {
                            console.log('connection.commit rollback! catch');
                            connection.rollback(function() {
                                connection.release();
                                logger.error('[insertTranPromise, insertBlockPromise]Promise.all catch rollback: ', err);
                                // throw err;
                            });

                        }).then(() => {
                            console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex, txLength);
                            // connection.release();
                            resolve({
                                err: err,
                                result: result
                            });
                        });

                    }).catch(err => {
                        logger.error('Promise.all(transactionPromises) catch rollback: ', err);
                        // console.log('transactionPromises rollback:', listIndex);
                        resolve({
                            err: err,
                            result: result
                        });
                    });
                } else {
                    let connection = await getConnectionPromise(pool);
                    insertBlock(blockInfoFormatted, connection, 'blocks_0').then(() => {
                        connection.release();
                        resolve({
                            err: err,
                            result: result
                        });
                    }).catch(err => {
                        connection.release();
                        resolve({
                            err: err,
                            result: result
                        });
                    });
                }
            } catch (error) {
                resolve({
                    code: 30000,
                    errType: 'codeError',
                    err: error
                });

                console.log('[error]rollback: ', listIndex, error);
                logger.error('rollback: ', listIndex, error);
            }
        });
    });
};

function scanTimerInit (pool, scanLimit) {
    setTimeout(() => {
        subscribe(pool, scanLimit);
    }, scanTimeInterval);
}

// subscribe 是真正定时任务执行时被运行的函数
async function subscribe(pool, scanLimit) {

    let result = await queryPromise(pool, 'select block_height from blocks_0 ORDER BY block_height DESC limit 1');
    let blockHeightInDataBase = 1;
    if (result && result[0] && result[0].block_height) {
        blockHeightInDataBase = parseInt(result[0].block_height, 10);
    }

    let blockHeightInChain;
    try {
        blockHeightInChain = parseInt(aelf.chain.getBlockHeight().result.block_height, 10);
    } catch(err) {
        restart(err, 'subscribe -> getBlockHeight()');
        return;
    }

    console.log('blockHeightInDataBase: ', blockHeightInDataBase);
    console.log('blockHeightInChain: ', blockHeightInChain);

    if (blockHeightInDataBase >= blockHeightInChain) {
        scanTimerInit(pool, scanLimit);

        if (!initAcquisitionReady) {
            initAcquisitionReady = true;
            initAcquisition();
        }
        return;
    }

    let max = Math.min(blockHeightInDataBase + scanLimit, blockHeightInChain);

    const promises = [];

    for (let i = blockHeightInDataBase + 1; i <= max; i++) {
        promises.push(scanABlock(i, pool));
    }

    let startTime = new Date().getTime();
    Promise.all(promises).then(result => {
        console.log('endTime: ', new Date().getTime() - startTime, 'scanTime: ', scanTime);
        scanTime = 0;
    }).catch(err => {
        restart(err, `subscribe Promise.all fail, ${new Date().getTime() - startTime}`);
    }).then(() => {
        subscribe(pool, scanLimit);
    });
    // 问：如何保证一个块中的所有的交易都插到了库里 -> 事务。
}

