/**
 * @file index.js
 * @author huangzongzhe
 * 2018.08
 */

// TODO
// 1. 需要增加检查, 每隔一段时间，或者多少次循环后，需要check一次是否有未入库的块。
// 2. let blockList = await connection.query('select block_height from blocks_0', []); 需要优化，当区块数到百万千万级别时，如何分页处理。
// 3. logger.error 的同时，执行console.log

const Aelf = require('aelf-sdk');
const log4js = require('log4js');

const {
    startTpsAcquisition,
    stopTpsAcquisition
} = require('./tps/initTpsAcquisition');

const {blockInfoFormat, transactionFormat} = require('./lib/format.js');
const {insertTransactions, insertBlock} = require('./lib/insertPure.js');
const missingList = require('./lib/missingList');
const {queryPromise} = require('./lib/mysql/queryPromise');
const {getConnectionPromise} = require('./lib/mysql/getConnectionPromise');
const {beginTransaction} = require('./lib/mysql/beginTransaction');

const mysql = require('mysql');

let {config} = require('./config/configInit.js');
log4js.configure(config.log4js);
const logger = log4js.getLogger('scan');

let aelf = new Aelf(new Aelf.providers.HttpProvider(config.aelf.network));
const {scanLimit, scanTimeInterval, restartTimeInterval, restartScanMissingListLimit} = config;

// 这个，然后再套上PM2...
// http://nodejs.cn/api/process.html#process_event_uncaughtexception
// 官方并不建议当做 On Error Resume Next的机制。
init();

function init() {
    aelf.chain.connectChain(err => {
        if (err) {
            logger.error('aelf.chain.connectChain err: ', err);
        }

        const aelfPool = mysql.createPool(config.mysql.aelf0);
        startScan(aelfPool, scanLimit);

    });
}

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
    stopTpsAcquisition();
    logger.error(`Err: ${err}, ExtraInfo: ${info}`);
    console.log('捕获到异常, 1分钟后重启: ', err);
    restartTime++;
    setTimeout(() => {
        logger.error(`第 ${restartTime} 次重启中》》》》》》》》》》`);
        init();
    }, restartTimeInterval);
}

// 统计用, 扫描时长
let scanTime = 0;

async function startScan(pool, scanLimit) {
    // TODO: 如果block数据有上百万条。这样做开销是极大的。检查程序应做成另外一个程序。
    let blockList = await queryPromise(pool, 'select block_height from blocks_0', []);

    // let list = missingList.getBlockMissingList([{block_height: 100}]);
    let list = missingList.getBlockMissingList(blockList);

    console.log('missingList: ', list, list.length);

    let startTime = new Date().getTime();

    const scanMissingListPromise = new Promise((resolve, reject) => {
        scanMissingList(list, resolve, reject);
    });
    scanMissingListPromise.then(() => {
        console.log('scanMissingListPromise then');
        subscribe(pool, scanLimit);
    }).catch(() => {
        console.log('scanMissingListPromise catch');
        // Too many restart
    }).then(() => {
        console.log('endTime: ', (new Date().getTime()) - startTime, 'scanTime: ', scanTime);
    });
}

function scanTimerInit(pool, scanLimit) {
    setTimeout(() => {
        subscribe(pool, scanLimit);
    }, scanTimeInterval);
}

// subscribe 是真正定时任务执行时被运行的函数
async function subscribe(pool, scanLimit) {

    let lastestBlockInDatabase = await queryPromise(pool, 'select block_height from blocks_0 ORDER BY block_height DESC limit 1');
    let blockHeightInDataBase = 1;
    if (lastestBlockInDatabase && lastestBlockInDatabase[0] && lastestBlockInDatabase[0].block_height) {
        blockHeightInDataBase = parseInt(lastestBlockInDatabase[0].block_height, 10);
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
        startTpsAcquisition();
        return;
    }

    let maxBlockHeight = Math.min(blockHeightInDataBase + scanLimit, blockHeightInChain);
    const scanBlocksPromises = [];
    for (let i = blockHeightInDataBase + 1; i <= maxBlockHeight; i++) {
        scanBlocksPromises.push(scanABlockPromise(i, pool));
    }

    let startTime = new Date().getTime();
    Promise.all(scanBlocksPromises).then(() => {
    // Promise.all(promises).then(result => {
        subscribe(pool, scanLimit);
        console.log('endTime: ', new Date().getTime() - startTime, 'scanTime: ', scanTime);
        scanTime = 0;
    }).catch(err => {
        restart(err, `subscribe scanBlocks failed, ${new Date().getTime() - startTime}`);
    });
}

function scanMissingList(missingList, resove, reject, restartCount = 0) {
    const {list, length} = missingList;

    if (restartCount > restartScanMissingListLimit) {
        const errMsg = 'Too many scanMissingListReStartTime, Scan Shutdown';
        logger.error(errMsg);
        console.log(errMsg);
        reject(errMsg);
        return;
    }
    if (length === 0) {
        resove();
        return;
    }

    const listGetNow = list.slice(0, scanLimit);
    const listTodo = list.slice(scanLimit, list.length);

    let scanMissingBlocksPromises = listGetNow.map(item => {
        return scanABlockPromise(item, pool);
    });

    Promise.all(scanMissingBlocksPromises).then(() => {
        restartCount = 0;
        scanMissingList({
            list: listTodo,
            length: listTodo.length
        }, resove, reject, restartCount);
    }).catch(err => {
        // 失败重试
        restartCount++;
        logger.error('[ERROR] scanMissingList catch: ', err);
        scanMissingList({
            list: list,
            length: list.length
        }, resove, reject, restartCount);
    });
}

/**
 * 获取区块和区块中的交易, 事务插入。
 * @Param {number} listIndex 区块高度
 * @Param {Object} pool mysql链接池
 *
 * @return {Object} Promise
 */
function scanABlockPromise(listIndex, pool) {
    return new Promise((resolve, reject) => {
        let startTime = new Date().getTime(); // 统计用

        const successCallback = (err, result) => {
            resolve({
                err,
                result
            });
        };
        const failedCallback = err => {
            logger.error(
                '\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',
                '\n[ERROR] scanABlockPromise failedCallback: ',
                '\n', err,
                '\n', JSON.stringify(err),
                '\n<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
            reject(err);
        };

        aelf.chain.getBlockInfo(listIndex, true, async (err, result) => {
            if (err || !result) {
                failedCallback({
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

                let insertOptions = {
                    pool,
                    blockInfoFormatted,
                    successCallback,
                    failedCallback,
                    listIndex,
                    txLength
                };

                // console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex, txLength);

                if (txLength) {
                    let transactionPromises = getTransactionPromises(result);

                    // 并发请求该块中所有交易。并插入数据库。
                    Promise.all(transactionPromises).then(async (result) => {
                        let txsList = [].concat(...result);

                        scanTime += (new Date().getTime()) - startTime;

                        insertOptions.transactionsDetail = txsList.map(item => transactionFormat(item, blockInfoFormatted));

                        insertBlockAndTxs(insertOptions);

                    }).catch(err => {
                        failedCallback({
                            code: 10001,
                            errType: `Block Height: ${listIndex}, Error when Promise.all(transactionPromises)`,
                            err: err,
                            result: result
                        });
                    });
                }
                else {
                    insertOnlyBlock(insertOptions);
                }
            }
            catch (err) {
                failedCallback({
                    code: 30000,
                    errType: 'Try Catch, Catch',
                    err: err
                });
                console.log('[error]rollback: ', listIndex, error);
            }
        });
    });
};

async function insertBlockAndTxs(option) {
    const {pool, transactionsDetail, blockInfoFormatted, successCallback, failedCallback, listIndex, txLength} = option;

    let connection = await getConnectionPromise(pool);

    beginTransaction(connection);

    let insertTranPromise = insertTransactions(transactionsDetail, connection, 'transactions_0');
    let insertBlockPromise = insertBlock(blockInfoFormatted, connection, 'blocks_0');

    Promise.all([insertTranPromise, insertBlockPromise]).then(result => {
        connection.commit(err => {
            if (err) {
                console.log('connection.commit rollback!');
                connection.rollback(function() {
                    connection.release();
                    failedCallback({
                        errType: `Block Height: ${listIndex}`
                        + '[insertTranPromise, insertBlockPromise]Promise.all then rollback',
                        err: err,
                        result: result
                    });
                });
            } else {
                console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex, txLength);
                connection.release();
                successCallback('', result);
            }
        });

    }).catch(err => {
        console.log('connection.commit rollback! catch');
        connection.rollback(function() {
            connection.release();
            failedCallback({
                errType: `Block Height: ${listIndex} [insertTranPromise, insertBlockPromise]Promise.all catch rollback`,
                err: err
            });
        });
    });
}

async function insertOnlyBlock(option) {
    const {pool, blockInfoFormatted, successCallback, failedCallback, listIndex} = option;
    let connection = await getConnectionPromise(pool);
    insertBlock(blockInfoFormatted, connection, 'blocks_0').then(result => {
        connection.release();
        successCallback('', result);
    }).catch(err => {
        connection.release();
        failedCallback({
            code: 10002,
            errType: `Block Height: ${listIndex}, Error when insertBlock(), txLength=0`,
            err: err
        });
    });
}

function getTransactionPromises(block) {
    const blockInfo = block.result;
    const blockHash = blockInfo.Blockhash;
    const blockHeight = blockInfo.Header.Index;
    const transactions = blockInfo.Body.Transactions;
    const txLength = transactions.length;
    let transactionPromises = [];
    const PAGELIMIT = 100; // 每页条数

    for (let offset = 0; offset < txLength; offset += PAGELIMIT) {
        transactionPromises.push(new Promise((resolve, reject) => {
            aelf.chain.getTxsResult(
                blockHash,
                offset,
                PAGELIMIT,
                function (error, result) {
                    if (error || !result || !result.result) {
                        console.log('error result getTxsResult: ', blockHeight, result, error);
                        logger.error('error result getTxsResult: ', blockHeight, result, error);
                        reject(error);
                    }
                    else {
                        const txsList = result.result || [];
                        resolve(txsList);
                    }
                }
            );
        }));
    }
    return transactionPromises;
}