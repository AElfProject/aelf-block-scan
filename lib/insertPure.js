/**
 * @file insertPure.js
 * @author huangzongzhe
 * 2018.08
 * https://stackoverflow.com/questions/17546450/for-array-is-it-more-efficient-to-use-map-reduce-instead-of-foreach-in
 * The source code of forEach & map: https://blog.csdn.net/u012841667/article/details/78375789
 * JsPerf: https://jsperf.com/zz-for-foreach-map
 */

/* eslint-disable fecs-camelcase */
const {queryPromise} = require('./mysql/queryPromise');
const {formatResourceDetail} = require('./formatResource');

module.exports = {
    insertTransactions,
    insertResourceTransactions,
    insertBlock,
    insertContract
};

/**
 * 批量插入交易
 *
 * @method insertTransactions
 * @param {Array} transactions
 * @param {Object} connection
 * @param {String} table
 */
// insertTransactions(txs, aelf0, 'transactions_0');
function insertTransactions(transactions, connection, table) {
    // 将max_allowed_packet调大，假设平均500B一条的话，能一次插1.6W条交易。
    // 如果数据实在过大, 拆分数据后再合并数据，多合几条sql。
    // let table = 'transactions_0';
    // let table = table;

    let keys = [
        'tx_id',
        'params_to',
        'chain_id',
        'block_height',
        'address_from',
        'address_to',
        'params',
        'method',
        'block_hash',
        // 'increment_id',
        'quantity',
        'tx_status',
        'time'
    ];
    let valuesBlank = keys.map(() => '?');

    let keysStr = `(${keys.join(',')})`;
    let values = [];
    let valuesStr = [];

    let promiseLists = [];

    transactions.map(item => {
        keys.map(key => {
            values.push(item[key]);
        });

        valuesStr.push(`(${valuesBlank.join(',')})`);
    });
    valuesStr = valuesStr.join(',');

    let sql = `insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE tx_id=VALUES(tx_id);`;
    promiseLists.push(queryPromise(connection, sql, values));
    return Promise.all(promiseLists);
}

/**
 * 批量插入资源币相关交易
 *
 * @method insertResourceTransactions
 * @param {Array} transactions
 * @param {Object} connection
 * @param {String} table
 */
// insertTransactions(txs, aelf0, 'transactions_0', contractAddressList);
function insertResourceTransactions(transactions, connection, table, contractAddressList) {
    if (!contractAddressList.resource) {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }

    const resourceTxs = transactions.filter(item => {
        const checkContractAddress = item.address_to === contractAddressList.resource;
        const checkMethod = item.method === 'BuyResource' || item.method === 'SellResource';
        return checkContractAddress && checkMethod;
    });
    if (!resourceTxs.length) {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }

    const resourceTxsFormatted = resourceTxs.map(item => {
        return formatResourceDetail(item);
    });

    let keys = [
        'tx_id',
        'address',
        'method',
        'type',
        'resource',
        'elf',
        'fee',
        'chain_id',
        'block_height',
        'tx_status',
        'time'
    ];
    let valuesBlank = keys.map(() => '?');

    let keysStr = `(${keys.join(',')})`;
    let values = [];
    let valuesStr = [];

    let promiseLists = [];

    resourceTxsFormatted.map(item => {
        const {
            tx_id,
            address,
            method,
            type,
            resource,
            elf,
            fee,
            chain_id,
            block_height,
            tx_status,
            time
        } = item;

        values = values.concat([
            tx_id, address, method, type, resource, elf, fee, chain_id, block_height, tx_status, time
        ]);

        valuesStr.push(`(${valuesBlank.join(',')})`);
    });
    valuesStr = valuesStr.join(',');

    let sql = `insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE tx_id=VALUES(tx_id);`;
    promiseLists.push(queryPromise(connection, sql, values));
    return Promise.all(promiseLists);
}

/**
 * 插入区块信息
 *
 * @method blockInfoFormatted
 * @param {Object} blockInfoFormatted
 * @param {Object} connection
 * @param {String} table
 */
// insertBlock(blockInfoFormatted, aelf0, 'blocks_0');
function insertBlock(blockInfoFormatted, connection, table) {
    let keys = [
        'block_hash',
        'pre_block_hash',
        'chain_id',
        'block_height',
        'tx_count',
        'merkle_root_tx',
        'merkle_root_state',
        'time'
    ];
    let valuesBlank = keys.map(() => '?');

    let keysStr = `(${keys.join(',')})`;
    let valuesStr = `(${valuesBlank.join(',')})`;

    let values = [];
    for (let each in blockInfoFormatted) {
        values.push(blockInfoFormatted[each]);
    }

    let sql = `insert into ${table} ${keysStr} VALUES ${valuesStr}`
        + 'ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);';
    return queryPromise(connection, sql, values);
}

/**
 * 插入区块信息
 *
 * @method insertContract
 * @param {Object} transaction
 * @param {Object} connection
 * @param {String} table
 */
// insertContract(item, connection, 'contract_aelf20');
// function insertContract(transaction, connection, table) {
function insertContract(tokenInfo, connection, table) {
    // transaction
    // let keys = [
    //     'tx_id',
    //     'params_to',
    //     'chain_id',
    //     'block_height',
    //     'address_from',
    //     'address_to',
    //     'params',
    //     'method',
    //     'block_hash',
    //     'increment_id',
    //     'quantity'
    // ];

    let keys = [
        'contract_address',
        'chain_id',
        'block_hash',
        'tx_id',
        'symbol',
        'name',
        'total_supply',
        'decimals'
    ];
    let valuesBlank = keys.map(() => {
        return '?';
    });

    let keysStr = `(${keys.join(',')})`;
    let valuesBlankStr = `(${valuesBlank.join(',')})`;

    // const values = tokenInfo;
    // let params = transaction.params.split(', ');
    // let values = [
    //     transaction.address_to,
    //     transaction.chain_id,
    //     transaction.block_hash,
    //     transaction.tx_id
    // ].concat(params);

    let sql = `insert into ${table} ${keysStr} VALUES ${valuesBlankStr}`
        + 'ON DUPLICATE KEY UPDATE contract_address=VALUES(contract_address);';
    return queryPromise(connection, sql, tokenInfo);
}
