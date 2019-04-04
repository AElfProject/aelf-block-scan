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
const {
    insertTransactions,
    insertResourceTransactions,
    insertBlock,
    insertContract
} = require('./lib/insertPure.js');
const missingList = require('./lib/missingList');
const {queryPromise} = require('./lib/mysql/queryPromise');
const {getConnectionPromise} = require('./lib/mysql/getConnectionPromise');
const {beginTransaction} = require('./lib/mysql/beginTransaction');

const {
    hexToString
} = require('./utils/utils');

const ScanTimer = require('./utils/ScanTimer'); 
const BlockUnconfirmed = require('./unconfirmed/removeRedundantData');

const mysql = require('mysql');

let {config} = require('./config/configInit.js');
log4js.configure(config.log4js);
const logger = log4js.getLogger('scan');

let aelf = new Aelf(new Aelf.providers.HttpProvider(config.aelf.network));
const {
    scanLimit,
    scanTimeInterval,
    restartTimeInterval,
    restartScanMissingListLimit,
    resourceContractAddress,
    removeUnconfirmedDataInterval,
    criticalBlocksCounts
} = config;

const {
    commonPrivateKey
} = config.aelf;

let contractAddressList = {
    token: null,
    resource: resourceContractAddress
};

const {
    confirmedSuffix,
    unconfirmedSuffix,
    unConfirmedTables
} = config.dbTable;
console.log('-----dbConfirmedSuffix ', config.dbTable, confirmedSuffix, unconfirmedSuffix);

const blockUnconfirmed = new BlockUnconfirmed({
    removeUnconfirmedDataInterval,
    unConfirmedTables
});
const scanTimer = new ScanTimer({
    callback: subscribe,
    interval: scanTimeInterval
});
// This and use pm2.
// http://nodejs.cn/api/process.html#process_event_uncaughtexception
// 官方并不建议当做 On Error Resume Next的机制。
init();

function init() {
    aelf.chain.connectChain((err, chainInfo) => {
        if (err) {
            logger.error('aelf.chain.connectChain err: ', err);
        }

        console.log(chainInfo);
        const aelfPool = mysql.createPool(config.mysql.aelf0);
        contractAddressList.token = insertTokenInfo(aelfPool, chainInfo); // return tokenContractAddress
        startScan(aelfPool, scanLimit);
    });
}

let restartTime = 0;
let restartTimer = null;
let restartInfoTimer = null;
process.on('uncaughtException', (err) => {
    if (!err.toString().match('Invalid JSON RPC response')) {
        return;
    }

    // Error: Invalid JSON RPC response: undefined
    restart(err);
});
function restart(err, info = '') {
    clearTimeout(restartTimer);
    clearTimeout(restartInfoTimer);

    restartInfoTimer = setTimeout(() => {
        stopTpsAcquisition();
        logger.error(`Err: ${err}, ExtraInfo: ${info}`);
        console.log('捕获到异常, 1分钟后重启: ', err);
    }, 100);
    restartTimer = setTimeout(() => {
        restartTime++;
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
        scanMissingList(list, pool, resolve, reject);
    });
    scanMissingListPromise.then(() => {
        console.log('scanMissingListPromise then');
        subscribe(pool, scanLimit);
    }).catch(err => {
        logger.error('scanMissingListPromise catch, Scan Shutdown!!!!!', err);
        console.log('scanMissingListPromise catch, Scan Shutdown!!!!!', err);
        // Too many restart
    }).then(() => {
        console.log('endTime: ', (new Date().getTime()) - startTime, 'scanTime: ', scanTime);
    });
}

// subscribe 是真正定时任务执行时被运行的函数
// 1.插入到unconfirmed库。
// 2.落后N个块的数据，插入到confirmed库。
async function subscribe(pool, scanLimit) {
    let blockHeightInDataBase = 0;
    let blockHeightInDataBaseUnconfirmed = 0;
    let blockHeightInChain;
    let criticalHeight;

    let lastestBlockInDatabase = await queryPromise(pool, 'select block_height from blocks_0 ORDER BY block_height DESC limit 1');
    let lastestBlockInDatabaseUnconfirmed
        = await queryPromise(pool, 'select block_height from blocks_unconfirmed ORDER BY block_height DESC limit 1');

    if (lastestBlockInDatabase && lastestBlockInDatabase[0] && lastestBlockInDatabase[0].block_height) {
        blockHeightInDataBase = parseInt(lastestBlockInDatabase[0].block_height, 10);
    }
    if (lastestBlockInDatabaseUnconfirmed && lastestBlockInDatabaseUnconfirmed[0] && lastestBlockInDatabaseUnconfirmed[0].block_height) {
        blockHeightInDataBaseUnconfirmed = parseInt(lastestBlockInDatabaseUnconfirmed[0].block_height, 10);
    }

    try {
        blockHeightInChain = parseInt(aelf.chain.getBlockHeight().result.block_height, 10);
    }
    catch (err) {
        restart(err, 'subscribe -> getBlockHeight()');
        return;
    }

    criticalHeight = blockHeightInChain - criticalBlocksCounts;

    console.log('blockHeightInDataBase: ', blockHeightInDataBase);
    console.log('blockHeightInDataBaseUnconfirmed: ', blockHeightInDataBaseUnconfirmed);
    console.log('blockHeightInChain: ', blockHeightInChain);

    if (blockHeightInDataBase >= blockHeightInChain - criticalBlocksCounts) {
        scanTimer.startTimer(pool, scanLimit);
        startTpsAcquisition();
        blockUnconfirmed.removeRedundantData(pool, Math.min(criticalHeight - 100, blockHeightInDataBaseUnconfirmed - criticalBlocksCounts), scanTimer);
        return;
    }

    let maxBlockHeight = Math.min(blockHeightInDataBase + scanLimit, blockHeightInChain - criticalBlocksCounts);

    const scanBlocksPromises = [];
    for (let i = blockHeightInDataBase + 1; i <= maxBlockHeight; i++) {
        scanBlocksPromises.push(scanABlockPromise(i, pool));
    }

    const scanBlocksPromisesUnconfirmed = [];
    if (blockHeightInDataBase + 1 >= criticalHeight) {
        blockHeightInDataBaseUnconfirmed = Math.max(criticalHeight, blockHeightInDataBaseUnconfirmed);
        
        for (let i = blockHeightInDataBaseUnconfirmed + 1; i <= blockHeightInChain; i++) {
            scanBlocksPromisesUnconfirmed.push(scanAUnconfirmedBlockPromise(i, pool));
        }
    }

    let startTime = new Date().getTime();
    // Promise.all(scanBlocksPromises).then(() => {
    Promise.all([...scanBlocksPromises, ...scanBlocksPromisesUnconfirmed]).then(() => {
        // Promise.all(promises).then(result => {
        subscribe(pool, scanLimit);
        console.log('endTime: ', new Date().getTime() - startTime, 'scanTime: ', scanTime, ' time now:', new Date());
        scanTime = 0;
    }).catch(err => {
        restart(err, `subscribe scanBlocks failed, ${new Date().getTime() - startTime}`);
    });
}

function scanMissingList(missingList, pool, resolve, reject, restartCount = 0) {
    const {list, length} = missingList;

    if (restartCount > restartScanMissingListLimit) {
        const errMsg = 'Too many scanMissingListReStartTime, Scan Shutdown';
        logger.error(errMsg);
        console.log(errMsg);
        reject('');
        return;
    }

    if (length === 0) {
        resolve();
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
        }, pool, resolve, reject, restartCount);
    }).catch(err => {
        // 失败重试
        restartCount++;
        logger.error('[ERROR] scanMissingList catch: ', err);
        console.error('[ERROR] scanMissingList catch: ', err);
        scanMissingList({
            list: list,
            length: list.length
        }, pool, resolve, reject, restartCount);
    });
}

/**
 * get block & txs in the block, insert through transaction(sql).
 * @Param {number} listIndex block height
 * @Param {Object} pool mysql poll
 *
 * @return {Object} Promise
 */
function scanABlockPromise(listIndex, pool, isUnconfirmed = false) {
    return new Promise((resolve, reject) => {
        let startTime = new Date().getTime();

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

        // aelf.chain.getBlockInfo(1545, true, async (err, result) => {
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
                let blockInfoFormatted = blockInfoFormat(blockInfo);
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
                // console.log(listIndex, blockInfo);
                if (txLength) {
                    let transactionPromises = getTransactionPromises(result);

                    // 并发请求该块中所有交易。并插入数据库。
                    Promise.all(transactionPromises).then(async (result) => {
                        let txsList = [].concat(...result);

                        scanTime += (new Date().getTime()) - startTime;

                        insertOptions.transactionsDetail = txsList.map(item => {
                            return transactionFormat(item, blockInfoFormatted, contractAddressList)
                        });

                        insertOptions.isUnconfirmed = isUnconfirmed;

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
}

function scanAUnconfirmedBlockPromise(listIndex, pool) {
    return scanABlockPromise(listIndex, pool, true);
}

async function insertBlockAndTxs(option) {
    const {
        pool,
        transactionsDetail,
        blockInfoFormatted,
        successCallback,
        failedCallback,
        listIndex,
        txLength,
        isUnconfirmed
    } = option;

    const suffix = isUnconfirmed ? unconfirmedSuffix : confirmedSuffix;
    let connection = await getConnectionPromise(pool);

    beginTransaction(connection);

    // let insertTranPromise = insertTransactions(transactionsDetail, connection, 'transactions_0');
    // let insertResourceTranPromise
    //     = insertResourceTransactions(transactionsDetail, connection, 'resource_0', contractAddressList);
    // let insertBlockPromise = insertBlock(blockInfoFormatted, connection, 'blocks_0');
    let insertTranPromise = insertTransactions(transactionsDetail, connection, 'transactions' + suffix);
    let insertResourceTranPromise
        = insertResourceTransactions(transactionsDetail, connection, 'resource' + suffix, contractAddressList);
    let insertBlockPromise = insertBlock(blockInfoFormatted, connection, 'blocks' + suffix);

    // Promise.all([insertTranPromise, insertBlockPromise]).then(result => {
    Promise.all([insertTranPromise, insertResourceTranPromise, insertBlockPromise]).then(result => {
        connection.commit(err => {
            if (err) {
                console.log('connection.commit rollback!');
                connection.rollback(function () {
                    connection.release();
                    failedCallback({
                        errType: `Block Height: ${listIndex}`
                            + '[insertTranPromise, insertBlockPromise]Promise.all then rollback',
                        err: err,
                        result: result
                    });
                });
            }
            else {
                console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex, txLength);
                connection.release();
                successCallback('', result);
            }
        });

    }).catch(err => {
        console.log('connection.commit rollback! catch');
        connection.rollback(function () {
            connection.release();
            failedCallback({
                errType: `Block Height: ${listIndex} [insertTranPromise, insertBlockPromise]Promise.all catch rollback`,
                err: err
            });
        });
    });
}

async function insertOnlyBlock(option) {
    const {
        pool,
        blockInfoFormatted,
        successCallback,
        failedCallback,
        listIndex
    } = option;
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
    const PAGELIMIT = 100;

    // transactionPromises = getTxResultPromises(transactions, txLength, blockHeight);
    transactionPromises = getTxsResultPromises(txLength, blockHash, PAGELIMIT, blockHeight);

    return transactionPromises;
}

// function getTxResultPromises(transactions, txLength, blockHeight) {
//     let transactionPromises = [];
//     for (let i = 0; i < txLength; i++) {
//         transactionPromises.push(new Promise((resolve, reject) => {
//             aelf.chain.getTxResult(transactions[i], (error, result) => {
//                 if (error || !result) {
//                     console.log('error result getTxResult: ', blockHeight, result, error);
//                     reject(error);
//                 }
//                 else {
//                     resolve(result.result);
//                 }
//             });
//         }));
//     }
//     return transactionPromises;
// }

function getTxsResultPromises(txLength, blockHash, PAGELIMIT, blockHeight) {
    let transactionPromises = [];
    for (let offset = 0; offset < txLength; offset += PAGELIMIT) {
        transactionPromises.push(new Promise((resolve, reject) => {
            return aelf.chain.getTxsResult(
                blockHash,
                offset,
                PAGELIMIT, function (error, result) {
                    if (error || !result || !result.result) {
                        console.log('error result getTxsResult: ', blockHeight, blockHash, result, error);
                        logger.error('error result getTxsResult: ', blockHeight, blockHash, result, error);
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

function insertTokenInfo(connection, chainInfo) {
    var wallet = Aelf.wallet.getWalletByPrivateKey(commonPrivateKey);
    const tokenContractAddress = chainInfo.result['AElf.Contracts.Token'];
    const chainID = chainInfo.result.chain_id;
    // 这里是同步请求
    const tokenContractMethods = aelf.chain.contractAt(tokenContractAddress, wallet);
    const tokenInfo = [
        tokenContractAddress, chainID,
        'block_hash',
        'txid',
        hexToString(tokenContractMethods.Symbol().return),
        hexToString(tokenContractMethods.TokenName().return),
        parseInt(tokenContractMethods.TotalSupply().return, 16),
        parseInt(tokenContractMethods.Decimals().return, 16)
    ];
    console.log('tokenInfo', tokenInfo);
    insertContract(tokenInfo, connection, 'contract_aelf20');
    return tokenContractAddress;
}
