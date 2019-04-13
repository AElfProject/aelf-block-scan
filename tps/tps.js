/**
 * @file
 * @author huangzongzhe
 * 2018.11.28 IFC Beijing
 * 0.默认已经完成了扫块的工作。
 * 1.获取第一个块后, 获取每个间隔时间段内的区块，并且在这个区间外还有块数据，算出tps tpm后，入库。
 * 2.如果数据有问题，删了重来就行了。
 *
 * 例子：
 * 如果第一个块的时间距离现在大于1个小时。则从数据库内按间隔一天获取数据，在程序中对数据进行分割。
 * 每日单链的极限出块数据 24 * 3600 / 4 = 21600, 批量插入tps数据为 24 * 60 / 5 = 288。
 * 比如今天是2018.11.28 17:00
 * 第一个数据是 2018.11.11, 则获取11.11 - 11.12数据，清洗入库。
 * 最后获取2018.11.28 xx: 00 ~ 2018.11.28 16:00 数据清洗入库。
 */

const moment = require('moment');
const mysql = require('mysql');
const {queryPromise} = require('../lib/mysql/queryPromise');
let config = require('../config/configInit.js').config;
config.mysql.aelf0.connectionLimit = Math.ceil(config.mysql.aelf0.connectionLimit / 4);

// 每 MINUTES 分钟 区间的数据采集入库。单位：分钟
// const MINUTES = 5;
const MINUTES = 1;
// 接 MINUTES, 区间给程序使用，需要使用秒来处理。单位：秒
const INTERVAL = MINUTES * 60;
// For setTimeout, 日常采集数据方法调用的时间间隔。单位：毫秒
// const SCANINTERVAL = 60000; // 60s
const SCANINTERVAL = 55000; // 55s
// 延迟 DEALYTIME 秒数。如果 结束时间 < (当前时间 - DEALYTIME), 可以调用采集方法，否则setTimeout
const DEALYTIME = 10;
// 3600s 执行批量处理的临街时间，如果tps数据落后当前时间 BATCHLIMITTIME 秒时, 批量处理。单位：秒
const BATCHLIMITTIME = 3600;
// 批量处理时,最长的时间间隔。
// 例：从数据库获取 between start_time and (start_time + BATCHDAYINTERVAL) 这个日期区间的数据。单位：秒
const BATCHDAYINTERVAL = 86400; // 24 * 3600 s
// BP节点数 * 出块间隔秒数
// const TIMELIMIT = 17 * 4;

const CURRENTTIME = (new Date()).getTime() / 1000;

const aelfPool = mysql.createPool(config.mysql.aelf0);

const tpsInsertSql = getInsertTpsSql();

init(aelfPool);

async function init(pool) {
    const firstBlockInBlockTable = await queryPromise(pool, 'select * from blocks_0 where block_height=1', []);
    const latestBlockInTPSTable = await queryPromise(
        pool,
        'select * from tps_0 order by end DESC limit 1 offset 0',
        []
    );

    const startTimeUnix01 = firstBlockInBlockTable[0] && moment(firstBlockInBlockTable[0].time).unix() || 0;
    if (!startTimeUnix01) {
        const errorMsg = 'can not find the first block in Database!';
        console.error(errorMsg);
        throw Error(errorMsg);
    }

    const startTimeUnix02 = latestBlockInTPSTable.length ? moment(latestBlockInTPSTable[0].end).unix() : 0;
    const startTimeUnix = Math.max(startTimeUnix01, startTimeUnix02);

    getTpsTypeFilter(pool, startTimeUnix);
}

function getTpsTypeFilter(pool, startTimeUnix) {
    const currentStartInterval = CURRENTTIME - startTimeUnix;

    let endTimeUnix = startTimeUnix + INTERVAL;
    let insertBatch = false;

    if (currentStartInterval > BATCHLIMITTIME) {
        if (currentStartInterval > BATCHDAYINTERVAL) {
            endTimeUnix = startTimeUnix + BATCHDAYINTERVAL;
        }
        else {
            endTimeUnix = CURRENTTIME - BATCHLIMITTIME;
        }
        insertBatch = true;
    }
    console.log('getTpsTypeFilter: ', insertBatch);
    getTps(pool, startTimeUnix, endTimeUnix, insertBatch);
}

function getInsertTpsSql(tpsValueBlankString) {
    const tpsTableKeys = [
        // id, auto increment
        'start',
        'end',
        'txs',
        'blocks',
        'tps',
        'tpm',
        'type'
    ];

    let tpsValuesBlank = tpsTableKeys.map(() => {
        return '?';
    });

    let tpsKeysString = `(${tpsTableKeys.join(',')})`;
    let tpsValuesBlankStringDefault = `(${tpsValuesBlank.join(',')})`;

    tpsValueBlankString = tpsValueBlankString || tpsValuesBlankStringDefault;

    const tpsInsertSql
        = `insert into tps_0 ${tpsKeysString} VALUES ${tpsValueBlankString}`
        + 'ON DUPLICATE KEY UPDATE start=(start);';
    return tpsInsertSql;
}

async function insertTps(pool, blocks, startTime, endTime) {
    if (blocks.length) {
        let txCount = 0;
        blocks.map(block => {
            txCount += parseInt(block.tx_count, 10);
        });
        const tps = txCount / INTERVAL;
        const tpm = txCount * 60 / INTERVAL;

        // Key in DateBase [startTime, endTime, txCount, blocksCount, tps, tpm, type];
        const queryValues = [startTime, endTime, txCount, blocks.length, tps, tpm, MINUTES];
        await queryPromise(pool, tpsInsertSql, queryValues);
    } else {
        const queryValues = [startTime, endTime, 0, 0, 0, 0, MINUTES];
        await queryPromise(pool, tpsInsertSql, queryValues);
    }
}

async function insertTpsBatch(pool, tpsList) {
    const startTime = (new Date()).getTime();

    let blankTemp = [];
    for (let each in tpsList[0]) {
        blankTemp.push('?');
    }
    // blankString Demo: (?, ?, ?, ?, ?, ?, ?)
    let blankString = `(${blankTemp.join(',')})`;

    let tpsValueList = [];
    let tpsValueBlankString = blankString;

    for (let index = 0, length = tpsList.length; index < length; index++) {
        if (index) {
            tpsValueBlankString += ',' + blankString;
        }
        const item = tpsList[index];
        for (let each in item) {
            tpsValueList.push(item[each]);
        }
    }

    const tpsInsertSql = getInsertTpsSql(tpsValueBlankString);
    await queryPromise(pool, tpsInsertSql, tpsValueList);

    console.log('insert time: ', ((new Date()).getTime()) - startTime);
}

async function getTps(pool, startTimeUnix, endTimeUnix, insertBatch = false) {
    // Mysql '2018-11-05T03:29:18Z' and '2018-11-05T03:34:18Z'
    // Will not get the data of 2018-11-05T03:29:18.xxxZ
    // startTimeUnix -= 1;
    const startTime = moment.unix(startTimeUnix).utc().format();
    const endTime = moment.unix(endTimeUnix).utc().format();
    const blocksConfirmed = await queryPromise(
        pool,
        'select * from blocks_0 where time between ? and ? order by time ASC',
        [startTime, endTime]
    );
    const blocksUnconfirmed = await queryPromise(
        pool,
        'select * from blocks_unconfirmed where time between ? and ? order by time ASC',
        [startTime, endTime]
    );
    const blocks = blocksConfirmed.length ? blocksConfirmed : blocksUnconfirmed;

    if (insertBatch) {
        let needInsertList = [];
        for (let timeTemp = startTimeUnix, timeIndex = 0; timeTemp < endTimeUnix; timeTemp += INTERVAL, timeIndex++) {
            const startTimeUnixTemp = timeTemp;
            const endTimeUnixTemp = timeTemp + INTERVAL;
            let option = {
                start: moment.unix(startTimeUnixTemp).utc().format(),
                end: moment.unix(endTimeUnixTemp).utc().format(),
                txs: 0,
                blocks: 0,
                tps: 0,
                tpm: 0,
                type: MINUTES
            };
            for (let index = 0, length = blocks.length; index < length; index++) {
                const block = blocks[0];
                const blockTime = block.time;
                const blockTimeUnix = moment(blockTime).unix();

                if (blockTimeUnix < endTimeUnixTemp) {
                    option.txs += parseInt(block.tx_count, 10);
                    option.blocks++;
                    blocks.shift();
                }
                else {
                    break;
                }
            }
            option.tps = option.txs / INTERVAL;
            option.tpm = option.txs / MINUTES;
            needInsertList.push(option);
        }

        // console.log(blocks[0], needInsertList, needInsertList.length);
        await insertTpsBatch(pool, needInsertList);
        getTpsTypeFilter(pool, endTimeUnix);
        return;
    }

    const newEndTimeUnix = endTimeUnix + INTERVAL;
    const nowTimeUnix = (new Date()).getTime() / 1000;

    console.log('FYI: ', endTimeUnix, newEndTimeUnix, nowTimeUnix, nowTimeUnix - newEndTimeUnix);
    if (newEndTimeUnix < (nowTimeUnix - DEALYTIME)) {
        await insertTps(pool, blocks, startTime, endTime);
        getTpsTypeFilter(pool, endTimeUnix);
    }
    else {
        console.log('into interval, interval seconds: ', SCANINTERVAL / 1000);
        setTimeout(function () {
            getTps(pool, startTimeUnix, endTimeUnix);
        }, SCANINTERVAL);
    }
}
