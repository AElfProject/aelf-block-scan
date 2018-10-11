/*
 * huangzongzhe
 * 2018.08
 */

// TODO
// 1. 目前我的电脑大概每1~2秒处理100个块，2.8 GHz Intel Core i7， 16 GB 2133 MHz LPDDR3  待优化。
// 2. 优化过程中，两个insert的 事务操作需要补充完毕。
// 3. 需要增加检查, 每隔一段时间，或者多少次循环后，需要check一次是否有未入库的块。
// 4. let blockList = await connection.query('select block_height from blocks_0', []); 需要优化，当区块数到百万千万级别时，如何分页处理。

let config = require('./config/config.local.js');
// let config = require('./config.js');
const Aelf = require('aelf-sdk');
const fs = require('fs');
const log4js = require('log4js');
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
let scanLimit = config.scanLimit;
let scanTimerReady = false;

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
    console.log('捕获到异常, 5分钟后重启: ', err);
    restartTime++;
    setTimeout(() => {
        console.log(`第 ${restartTime} 次重启中》》》》》》》》》》`);
        init();
    }, 1000 * 60 * 5);
});

init();

function init() {
    aelf.chain.connectChain(err => {
        if (err) {
            logger.error('aelf.chain.connectChain err: ', err);
        }
        let wallet = Aelf.wallet.getWalletByPrivateKey(config.aelf.commonPrivateKey);
        // let tokenc = aelf.chain.contractAt(config.aelf.contract, wallet);

        // let aelf0
        var aelfPool  = mysql.createPool(config.mysql.aelf0);
        startScan(aelfPool, scanLimit);

    });
}


// 统计用
let scanTime = 0;

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
    // 其实是机器可能扛不住，资源占用过高。。。
    let list = missingList.getBlockMissingList(blockList);

    console.log('missingList: ', list);
    // console.log('missingList: ', blockList, list);
    // return;
    let startTime = new Date().getTime();
    let scanABlockPromises = list.list.map(item => {
        return scanABlock(item, pool);
    });

    Promise.all(scanABlockPromises).then(async () => {
        let endTime = new Date().getTime();
        console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);

        let blockList = await queryPromise(pool, 'select block_height from blocks_0', []);
        let list = missingList.getBlockMissingList(blockList);
        console.log('list.length: ', list.length);
        if (list.length) {
            console.log('missingList: ', list);
            startScan(pool, scanLimit);
            return;
        }
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

                    for (let i = 0; i < txLength; i++) {
                        transactionPromises.push(new Promise((resolve, reject) => {
                            aelf.chain.getTxResult(transactions[i], (error, result) => {

                                if (error || !result) {
                                    console.log('error result getTxResult: ', listIndex, result);
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            });
                        }));
                    }

                    Promise.all(transactionPromises).then(async (result) => {

                        let endTime = new Date().getTime();
                        scanTime += endTime - startTime;

                        transactionsDetail = result.map(item => {
                            return transactionFormat(item.result, blockInfoFormatted);
                        });

                        let connection = await getConnectionPromise(pool);
                        // let tranConn = beginTransaction(connection);
                        beginTransaction(connection)

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
                    // 创世区块没有交易？
                    // 2018.09.03。。。创世区块get_block_info有问题，暂时不读取了, 其它块有无交易的情况发生。
                    // if (listIndex === 0) {
                    //     insertBlock(blockInfoFormatted, connection, 'blocks_0');
                    // }
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
                // 错误日志记录
                // console.log('getBlockInfo::: ', error);
                // console.log('__dirname----------->: ', __dirname);

                // let file = __dirname + "/error.json";
                // let result = JSON.parse(fs.readFileSync(file));
                // result = result || {
                //   list: []
                // };

                // result.list.push(listIndex);
                // fs.writeFileSync(file, JSON.stringify(result));

                console.log('[error]rollback: ', listIndex, error);
                logger.error('rollback: ', listIndex, error);
            }
        });
    });
};

function scanTimerInit (pool, scanLimit) {
    let scanTimeInterval = config.scanTimeInterval;
    let timeout = setTimeout(() => {
        subscribe(pool, scanLimit);
    }, scanTimeInterval);
}

// subscribe 是真正定时任务执行时被运行的函数
async function subscribe(pool, scanLimit) {

    // 我的mbp, egg和node都在本机，200毫秒上下
    let result = await queryPromise(pool, 'select block_height from blocks_0 ORDER BY block_height DESC limit 1');
    // 2018.09.03, 高度为0的区块，始终返回invalid BlockHeight
    // let blockHeightInDataBase = 0;
    let blockHeightInDataBase = 1;
    if (result && result[0] && result[0].block_height) {
        blockHeightInDataBase = parseInt(result[0].block_height, 10);
    }
    let blockHeightInChain = parseInt(aelf.chain.getBlockHeight().result.block_height, 10);

    console.log('blockHeightInDataBase: ', blockHeightInDataBase);
    console.log('blockHeightInChain: ', blockHeightInChain);

    if (blockHeightInDataBase >= blockHeightInChain) {
        // scanTimerReady = true;
        scanTimerInit(pool, scanLimit);
        return;
    }
    // scanTimerReady = false;

    let max = Math.min(blockHeightInDataBase + scanLimit, blockHeightInChain);

    const promises = [];

    for (let i = blockHeightInDataBase + 1; i <= max; i++) {
        promises.push(scanABlock(i, pool));
    }

    let startTime = new Date().getTime();
    Promise.all(promises).then(result => {

        let endTime = new Date().getTime();
        console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);
        scanTime = 0;
        logger.error(endTime - startTime);

        // subscribe(pool, scanLimit);

    }).catch(err => {
        let endTime = new Date().getTime();
        logger.error('subscribe Promise.all fail: ', err, endTime - startTime);
    }).then(() => {
        subscribe(pool, scanLimit);
    });
    // 问：如何保证一个块中的所有的交易都插到了库里 -> 事务。
}

