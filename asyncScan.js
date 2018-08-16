/*
 * huangzongzhe
 * 2018.08
 */

// TODO
// 1. 目前我的电脑只能跑10~20个block每秒，2.8 GHz Intel Core i7， 16 GB 2133 MHz LPDDR3  待优化。
// 2. 优化过程中，两个insert的 事务操作需要补充完毕。
// 3. 需要增加检查, 每隔一段时间，或者多少次循环后，需要check一次是否有未入库的块。

let config = require('./config.js');
const Aelf = require('aelf-sdk');
const fs = require('fs');
const path = require('path');
const rds = require('ali-rds');
const log4js = require('log4js');
const { blockInfoFormat, transactionFormat } = require('./lib/format.js');
const { insertTransactions, insertBlock, insertContract } = require('./lib/insert.js');
const missingList = require('./lib/missingList');

log4js.configure(config.log4js);
const logger = log4js.getLogger('scan');

let aelf = new Aelf(new Aelf.providers.HttpProvider("http://localhost:1234"));
let scanLimit = config.scanLimit;
let scanTimerReady = false;

aelf.chain.connectChain(err => {
    if (err) {
        logger.error('aelf.chain.connectChain err: ', err);
    }
    let wallet = Aelf.wallet.getWalletByPrivateKey('f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71');
    let tokenc = aelf.chain.contractAt('0x358d01d001cd97775e7b7f32fd03f7f28c0a', wallet);

    let aelf0 = rds(config.mysql.aelf0);
    startScan(aelf0, scanLimit);

    // let connection = aelf0;
    // startScan(connection, scanLimit);
    
});

// 统计用
let scanTime = 0;

let scanABlock = function(listIndex, connection) {
    return new Promise((resolve, reject) => {
        let startTime = new Date().getTime();

        aelf.chain.getBlockInfo(listIndex, true, async (err, result) => {

            if (err || !result) {
                resolve({
                    err: err,
                    result: result
                });
            }

            let tran = await connection.beginTransaction();

            try {
                let blockInfo = result.result;
                let transactions = blockInfo.Body.Transactions;
                let blockInfoFormatted  = blockInfoFormat(blockInfo);

                let txLength = transactions.length;

                console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex, txLength);

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

                    Promise.all(transactionPromises).then(result => {
                        transactionsDetail = result.map(item => {
                            return transactionFormat(item.result, blockInfoFormatted);
                        });

                        // TODO: 这里还有问题。  两个insert过程发生了问题，无法回滚。
                        insertTransactions(transactionsDetail, connection, 'transactions_0');
                        insertBlock(blockInfoFormatted, connection, 'blocks_0');

                        tran.commit();

                        resolve({
                            err: err,
                            result: result
                        });
                    }).catch(err => {
                        console.log('transactionPromises rollback:', listIndex);
                        tran.rollback();

                        resolve({
                            err: err,
                            result: result
                        });
                    });
                } else {
                    // 创世区块没有交易？
                    if (listIndex === 0) {
                        insertBlock(blockInfoFormatted, connection, 'blocks_0');
                    }

                    resolve({
                        err: err,
                        result: result
                    });
                }
            } catch (error) {
                tran.rollback();

                resolve({
                    err: err,
                    result: result
                });
                // 错误日志记录
                // console.log('getBlockInfo::: ', error);
                // console.log('__dirname----------->: ', __dirname);

                let file = __dirname + "/error.json";
                let result = JSON.parse(fs.readFileSync(file));
                result = result || {
                  list: []
                };

                result.list.push(listIndex);
                fs.writeFileSync(file, JSON.stringify(result));

                console.log('[error]rollback: ', listIndex, error);
                logger.error('rollback: ', listIndex, error);
            }
            let endTime = new Date().getTime();
            scanTime += endTime - startTime;
        });
    });
};
// let start = 0;

function scanTimerInit (connection, scanLimit) {
    let scanTimeInterval = config.scanTimeInterval;
    let timeout = setTimeout(() => {
        if (scanTimerReady) {
            subscribe(connection, scanLimit);
        } else {
            clearTimeout(timeout);
            setTimeout(() => {
                scanTimerInit(connection, scanLimit);
            }, scanTimeInterval);
        }
    }, scanTimeInterval);
}

// subscribe 是真正定时任务执行时被运行的函数
async function subscribe(connection, scanLimit) {

    // 我的mbp, egg和node都在本机，200毫秒上下
    let result = await connection.query('select block_height from transactions_0 ORDER BY block_height DESC limit 1');

    let blockHeightInDataBase = 0;
    if (result && result[0] && result[0].block_height) {
        blockHeightInDataBase = parseInt(result[0].block_height, 10);
    }
    let blockHeightInChain = parseInt(aelf.chain.getBlockHeight().result.block_height, 10);

    console.log('blockHeightInDataBase: ', blockHeightInDataBase);
    console.log('blockHeightInChain: ', blockHeightInChain);

    if (blockHeightInDataBase >= blockHeightInChain) {
        scanTimerReady = true;
        scanTimerInit(connection, scanLimit);
        return;
    }
    scanTimerReady = false;

    let max = Math.min(blockHeightInDataBase + scanLimit, blockHeightInChain);
    // let max = Math.min(start + limit, blockHeightInChain);

    const promises = [];

    // for (let i = start; i < max; i++) {
    for (let i = blockHeightInDataBase; i <= max; i++) {
        // console.log('block i: ', i);
        promises.push(scanABlock(i, connection));
    }
    // start = max;

    let startTime = new Date().getTime();
    Promise.all(promises).then(result => {
        // console.log('Promise.all: ', result);
        let endTime = new Date().getTime();
        console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);
        scanTime = 0;
        logger.error(endTime - startTime);

        subscribe(connection, scanLimit);
        console.log('Promise.all: ');

    }).catch(err => {
        console.log('scan Block - 理论上这一些promises是没有err的: ', err);
    });
    // 问：如何保证一个块中的所有的交易都插到了库里 -> 事务。
}

async function startScan(connection, scanLimit) {
    // 供测试使用，我的mbp, 13次/s, cpu占用率特别高。
    // setInterval(function () {
    //     console.log('11111');
    //     aelf.chain.getTxResult('0x5c5d001bd72f6f8d939a1203fcaa686bdcbc2b027a79b05de8e49e529c5b97a7', (error, result) => {
            
    //     });
    // }, 75);

    let blockList = await connection.query('select block_height from blocks_0', []);
    // let list = missingList.getBlockMissingList([{block_height: 500}]);
    let list = missingList.getBlockMissingList(blockList);

    // console.log('missingList: ', list);
    let startTime = new Date().getTime();
    let scanABlockPromises = list.list.map(item => {
        return scanABlock(item, connection);
    });

    Promise.all(scanABlockPromises).then(async result => {
        let endTime = new Date().getTime();
        console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);

        let blockList = await connection.query('select block_height from blocks_0', []);
        let list = missingList.getBlockMissingList(blockList);
        if (list.length) {
            console.log('missingList: ', list);
            startScan(connection, scanLimit);
            return;
        }
        subscribe(connection, scanLimit);
    }).catch(err => {
        console.log('preScan - 理论上这一些promises是没有err的: ', err);
    });
    // missingList.getBlockMissingList([{block_height: 100}]).then(result => {
    // // missingList.getBlockMissingList(blockList).then(result => {
    //     console.log('missingList: ', result);
    //     let startTime = new Date().getTime();
    //     let scanABlockPromises = result.list.map(item => {
    //         return scanABlock(item, connection);
    //     });

    //     Promise.all(scanABlockPromises).then(result => {
    //         let endTime = new Date().getTime();
    //         console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);
    //         subscribe(connection, scanLimit);
    //     }).catch(err => {
    //         console.log('preScan - 理论上这一些promises是没有err的: ', err);
    //     });
    // });
}

// scanABlock(15839, connection);

