/*
 * huangzongzhe
 * 2018.08
 */
let config = require('./config.js');
const Aelf = require('aelf-sdk');
const fs = require('fs');
const path = require('path');
const rds = require('ali-rds');
const mysql = require('mysql');

const log4js = require('log4js');
const { blockInfoFormat, transactionFormat } = require('./lib/format.js');
const { insertTransactions, insertBlock, insertContract } = require('./lib/insert.js');
const missingList = require('./lib/missingList');

log4js.configure(config.log4js);
const logger = log4js.getLogger('scan');

let aelf = new Aelf(new Aelf.providers.HttpProvider("http://localhost:1234"));
let scanLimit = config.scanLimit;
let scanTimerReady = false;

let sqlQuery = function(connection, sql, values) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (error, results, fields) => {
            if (error) {
                reject(err);
            } else {
                resolve({
                    results: results,
                    fields: fields
                });
            }
        });
    });
};

aelf.chain.connectChain(err => {
    if (err) {
        logger.error('aelf.chain.connectChain err: ', err);
    }
    let wallet = Aelf.wallet.getWalletByPrivateKey('f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71');
    let tokenc = aelf.chain.contractAt('0x358d01d001cd97775e7b7f32fd03f7f28c0a', wallet);

    // let aelf0 = rds(config.mysql.aelf0);

    let aelf0 = mysql.createConnection(config.mysql.aelf0);

    let pool = mysql.createPool({
        connectionLimit: 150,
        ...config.mysql.aelf0
    });

    let connection = aelf0;
    
    startScan(connection, scanLimit, pool);
});

// 统计用
let scanTime = 0;

let scanABlock = function(listIndex, pool) {
    return new Promise((resolve, reject) => {
        let startTime = new Date().getTime();

        aelf.chain.getBlockInfo(listIndex, true, (err, result) => {
            if (err) {
                console.log('err result block: ', listIndex, result);
                resolve({
                    err: err,
                    result: result
                });
                return;
            }

            pool.getConnection((err, connection) => {
                if (err) throw err; // not connected!
                connection.beginTransaction(async (err) => {
                    // return resolve({
                    //     err: err,
                    //     result: result
                    // });
                    if (err) {
                        connection.release();
                        return resolve({
                            err: err,
                            result: result
                        });
                        // console.log('err result block: ', result);
                        // throw  err;
                    }
                    // try {
                        // console.log('result block: ', result);
                        let blockInfo = result.result;
                        let transactions = blockInfo.Body.Transactions;
                        let blockInfoFormatted  = blockInfoFormat(blockInfo);

                        console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex);

                        let transactionsDetail = [];
                        if (transactions.length) {
                            let transactionPromises = [];
                            for (let i = 0, j = transactions.length; i < j; i++) {
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

                                insertTransactions(transactionsDetail, connection, 'transactions_0');
                                insertBlock(blockInfoFormatted, connection, 'blocks_0');

                                // connection.commit();
                                connection.commit(function(err) {
                                    if (err) {
                                        connection.rollback(function() {
                                            resolve({
                                                err: err,
                                                result: result
                                            });
                                            // throw err;
                                        });
                                        return;
                                    }
                                    resolve({
                                        err: err,
                                        result: result
                                    });
                                    // console.log('success!');
                                });
                                connection.release();
                                let endTime = new Date().getTime();
                                scanTime += endTime - startTime;
                                // console.log('transactionPromises success', result);
                            }).catch(err => {

                                connection.rollback(function() {
                                    resolve({
                                        err: err,
                                        result: result
                                    });
                                    // throw error;
                                });
                                connection.release();
                                let endTime = new Date().getTime();
                                scanTime += endTime - startTime;
                                // console.log('transactionPromises err', err);
                            });

                        } else {
                            connection.release();
                            return resolve({
                                err: err,
                                result: result
                            });
                        }
                });
            });

        });
    });
};
// let start = 0;

function scanTimerInit (connection, scanLimit, pool) {
    let scanTimeInterval = config.scanTimeInterval;
    let timeout = setTimeout(() => {
        if (scanTimerReady) {
            subscribe(connection, scanLimit, pool);
        } else {
            clearTimeout(timeout);
            setTimeout(() => {
                scanTimerInit(connection, scanLimit, pool);
            }, scanTimeInterval);
        }
    }, scanTimeInterval);
}

// subscribe 是真正定时任务执行时被运行的函数
async function subscribe(connection, scanLimit, pool) {

    // 我的mbp, egg和node都在本机，200毫秒上下
    // let result = await connection.query('select block_height from transactions_0 ORDER BY block_height DESC limit 1');
    sqlQuery(connection, 'select block_height from transactions_0 ORDER BY block_height DESC limit 1', []).then(output => {
        let result = output.results;
        let blockHeightInDataBase = 0;
        if (result && result[0] && result[0].block_height) {
            blockHeightInDataBase = parseInt(result[0].block_height, 10);
        }
        let blockHeightInChain = parseInt(aelf.chain.getBlockHeight().result.block_height, 10);

        console.log('blockHeightInDataBase: ', blockHeightInDataBase);
        console.log('blockHeightInChain: ', blockHeightInChain);

        if (blockHeightInDataBase >= blockHeightInChain) {
            scanTimerReady = true;
            scanTimerInit(connection, scanLimit, pool);
            return;
        }
        scanTimerReady = false;

        let max = Math.min(blockHeightInDataBase + scanLimit, blockHeightInChain);
        // let max = Math.min(start + limit, blockHeightInChain);

        const promises = [];

        // for (let i = start; i < max; i++) {
        for (let i = blockHeightInDataBase; i <= max; i++) {
            // console.log('block i: ', i);
            promises.push(scanABlock(i, pool));
        }
        // start = max;

        let startTime = new Date().getTime();
        Promise.all(promises).then(result => {
            // console.log('Promise.all: ', result);
            let endTime = new Date().getTime();
            console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);
            scanTime = 0;
            logger.error(endTime - startTime);

            subscribe(connection, scanLimit, pool);
            console.log('Promise.all: ');

        }).catch(err => {
            console.log('scan Block - 理论上这一些promises是没有err的: ', err);
        });
    });

    // 问：如何保证一个块中的所有的交易都插到了库里 -> 事务。
}

async function startScan(connection, scanLimit, pool) {
    // let blockList = await connection.query('select block_height from blocks_0', []);

    sqlQuery(connection, 'select block_height from blocks_0', []).then(result => {
        // console.log(result);
        let blockList = result.results;

        // missingList.getBlockMissingList(blockList).then(result => {
        // missingList.getBlockMissingList([{block_height: 100}]).then(result => {

        let list = missingList.getBlockMissingList(blockList);

        console.log('missingList: ', list);
        let startTime = new Date().getTime();
        let scanABlockPromises = list.list.map(item => {
            return scanABlock(item, pool);
        });

        Promise.all(scanABlockPromises).then(result => {
            let endTime = new Date().getTime();
            console.log('endTime: ', endTime - startTime, 'scanTime: ', scanTime);
            subscribe(connection, scanLimit, pool);
        }).catch(err => {
            console.log('preScan - 理论上这一些promises是没有err的: ', err);
        });
        // missingList.getBlockMissingList(blockList).then(result => {
        // });

    }).catch(error => {
        // nothind
    });

    // missingList.getBlockMissingList(blockList).then(result => {
    //     console.log('missingList: ', result);
    //     let scanABlockPromises = result.list.map(item => {
    //         return scanABlock(item, connection);
    //     });

    //     Promise.all(scanABlockPromises).then(result => {
    //         subscribe(connection, scanLimit);
    //     }).catch(err => {
    //         console.log('preScan - 理论上这一些promises是没有err的: ', err);
    //     });

    // });
}

// scanABlock(15839, connection);

