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

aelf.chain.connectChain(err => {
    if (err) {
        logger.error('aelf.chain.connectChain err: ', err);
    }
    let wallet = Aelf.wallet.getWalletByPrivateKey('f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71');
    let tokenc = aelf.chain.contractAt('0x358d01d001cd97775e7b7f32fd03f7f28c0a', wallet);

    let pool = mysql.createPool({
        connectionLimit: 10,
        ...config.mysql.aelf0
    });

    pool.getConnection(function(err, connection) {
        if (err) throw err; // not connected!
        startScan(connection, scanLimit);

        // Use the connection
        // connection.query('SELECT something FROM sometable', function (error, results, fields) {
        //     // When done with the connection, release it.
        //     connection.release();
        //
        //     // Handle error after the release.
        //     if (error) throw error;
        //
        //     // Don't use the connection here, it has been returned to the pool.
        // });
    });

    // let aelf0 = rds(config.mysql.aelf0);

    // let connection = aelf0;

    // startScan(connection, scanLimit);
});

let getTxResult = function () {
    return new Promise((resolve, reject) => {
        aelf.chain.getTxResult(transactions[i]);
    });
}

// 统计用
let scanTime = 0;

let scanABlock = function(listIndex, connection, pool) {
    return new Promise((resolve, reject) => {
        let startTime = new Date().getTime();

        aelf.chain.getBlockInfo(listIndex, true, async (err, result) => {

            pool.getConnection((err, connection) => {
                if (err) throw err;
                connection.beginTransaction(err => {
                    if (err) throw  err;

                });
            });

            let tran = await connection.beginTransaction();

            // connection.beginTransaction((err, result) => {
            //     console.log('connection: ', err, connection);
            // });

            try {
                let blockInfo = result.result;
                let transactions = blockInfo.Body.Transactions;
                let blockInfoFormatted  = blockInfoFormat(blockInfo);

                console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', listIndex);

                let transactionsDetail = [];
                if (transactions.length) {
                    for (let i = 0, j = transactions.length; i < j; i++) {
                        //     // 批量处理
                        //     let transaction = await aelf.chain.getTxResult(transactions[i]).result;
                        //     transaction = transactionFormat(transaction, blockInfoFormatted);
                        //     transactionsDetail.push(transaction);
                    }

                    // aelf.chain.getTxResult(transactions[i], err);

                    // insertTransactions(transactionsDetail, connection, 'transactions_0');
                }
                // console.log('blockInfoFormatted: ', blockInfoFormatted);
                // insertBlock(blockInfoFormatted, connection, 'blocks_0');

                tran.commit();
            } catch (error) {
                tran.rollback();
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
            console.log('endTime - startTime: ', endTime - startTime);
            scanTime += endTime - startTime;

            resolve({
                err: err,
                result: result
            });
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

async function startScan(connection, scanLimit, pool) {
    // let blockList = await connection.query('select block_height from blocks_0', []);
    connection.query('select block_height from blocks_0', [], function (error, results, fields) {
        if (error) throw error;

        connection.release();

        let blockList = results;
        missingList.getBlockMissingList(blockList).then(result => {
            console.log('missingList: ', result);
            let scanABlockPromises = result.list.map(item => {
                return scanABlock(item, connection);
            });

            Promise.all(scanABlockPromises).then(result => {
                subscribe(connection, scanLimit);
            }).catch(err => {
                console.log('preScan - 理论上这一些promises是没有err的: ', err);
            });

        });
    });


}

// scanABlock(15839, connection);

