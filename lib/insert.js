/**
 * @file insert.js
 * @author huangzongzhe
 * 2018.08
 */
module.exports = {
    insertTransactions: insertTransactions,
    insertBlock: insertBlock,
    insertContract: insertContract
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
        'increment_id',
        'quantity'
    ];
    let valuesBlank = keys.map(() => {
        return '?';
    });

    let keysStr = `(${keys.join(',')})`;
    let values = [];
    let valuesStr = [];

    transactions.map(item => {
        // Special one.
        // 权衡了一下，为了减少sql的复杂度，在入库时整理一下好了。
        if (item.method === 'Initialize') {
            insertContract(item, connection, 'contract_aelf20');
            item.address_from = item.address_from + '_owner';
        }

        for (let each in item) {
            values.push(item[each]);
        }

        valuesStr.push(`(${valuesBlank.join(',')})`);
    });
    valuesStr = valuesStr.join(',');

    connection.query(`insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE tx_id=VALUES(tx_id);`, values);
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
    let valuesBlank = keys.map(() => {
        return '?';
    });

    let keysStr = `(${keys.join(',')})`;
    let valuesStr = `(${valuesBlank.join(',')})`;

    let values = [];
    for (let each in blockInfoFormatted) {
        values.push(blockInfoFormatted[each]);
    }

    connection.query(`insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);`, values);
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
function insertContract(transaction, connection, table) {
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

    let params = transaction.params.split(', ');
    let values = [transaction['address_to'], transaction['tx_id']].concat(params);

    // return mysqlQuery(connection, `insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE contract_address=VALUES(contract_address);`, values);
    connection.query(`insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE contract_address=VALUES(contract_address);`, values);
}