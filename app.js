/*
 * huangzongzhe
 * just a demo, please use scan.js
 */

let config = require('./config.js');
const mysql = require('mysql');
const fs = require('fs');

const rds = require('ali-rds');

const Aelf = require('aelf-sdk');
// const moment = require('moment');

// 我的mbp, egg和node都在本机，200毫秒上下
console.log(JSON.stringify(config));

let mysqlQuery = function(connection, sql, values) {
	return new Promise((resolve, reject) => {
		connection.query(sql, values, (err, rows) => {
			if (err) {
				// connection.rollback();
				reject(err);
			} else {
				resolve(rows);
			}
		});
	});
};

function blockInfoFormat(blockInfo) {
    // {
    //   "Blockhash": "0xab77f8040c5ca21f040d50f7980150137f99421f009b3c6ee4ee6b612d3c20dc",
    //   "Header": {
    //     "PreviousBlockHash": "0x59dfda9c8df722603ff0b0fbda3dd3eaf9a24062dbaed24f63aaa476d7a01a06",
    //     "MerkleTreeRootOfTransactions": "0x554ecbc61102471f65bcc32550f7fddddba7cb90a8f4c3620e79593d7795a942",
    //     "MerkleTreeRootOfWorldState": "0x085df4ecb2b50394fb09a9993828944de0b1cd18e2e55c0c5c3c9b42b1072ea9",
    //     "Index": "1",
    //     "Time": "2018-08-10T03:39:37.625647Z",
    //     "ChainId": "0xaf5de66168d27554dc5baaea887dc373db322921c3965b173eaad0237bc14aca"
    //   },
    //   "Body": {
    //     "TransactionsCount": 1,
    //     "Transactions": [
    //     "0x554ecbc61102471f65bcc32550f7fddddba7cb90a8f4c3620e79593d7795a942"
    //   ]
    //   },
    //   "CurrentTransactionPoolSize": 1
    // }
    // block_hash, pre_block_hash, chain_id, block_height, tx_count, merkle_root_tx, merkle_root_state, time
    let header = blockInfo.Header;
    let body = blockInfo.Body;
    let output = {
        block_hash: blockInfo.Blockhash,
        pre_block_hash: header.PreviousBlockHash,
        chain_id: header.ChainId,
        block_height: header.Index,
        tx_count: body.TransactionsCount,
        merkle_root_tx: header.MerkleTreeRootOfTransactions,
        merkle_root_state: header.MerkleTreeRootOfWorldState,
        time: header.Time // format 2018-08-03 17:26:03
    };
    return output;
}


function transactionFormat(transaction, blockInfo) {
    let method = transaction.tx_info.Method;
    let txInfo = transaction.tx_info;
    // {
    //   "tx_status": "Mined",
    //   "tx_info": {
    //   "TxId": "0x554ecbc61102471f65bcc32550f7fddddba7cb90a8f4c3620e79593d7795a942",
    //   "From": "0x04beb6b3aae09d4ae3b457e9a3066e08519f",
    //   "To": "0x52b297074b3fbcd9be2b9feed931b95917bc",
    //   "Method": "InitializeAElfDPoS",
    //   "IncrementId": 0,
    //   "params": "0x0a24303462656236623361616530396434616533623435376539613330363665303835313966, 0x0a5f0a5d0a243034626562366233616165303964346165336234353765396133303636653038353139661235080110012a220a2051d9bab266f5b03de734f4dbc4a9c91370d958b3b5cfea2d17af34d7736ffbf4320b08fa91b4db0510b8f5a05a0a3b0a390a24303462656236623361616530396434616533623435376539613330363665303835313966121108011001320b088292b4db0510b0ec935b, 0x08a01f"
    //   },
    //   "return": "0x"
    // }
    // 字段搞不清命名的话，去这个规范瞅。
    // http://www.szse.cn/main/files/2015/09/01/深圳证券交易所STEP交易数据接口规范1.00.pdf
    // tx_id, params_to, chain_id, block_height, address_from, address_to, params, method, block_hash, increment_id, quantity(qty)
    let params = txInfo.params.split(', ');
    // 一定要按数据库里字段的顺序排，后面的insertTransactions按这个顺序拼接的数据
    let output = {
        tx_id: txInfo.TxId,
        params_to: '',
        chain_id: blockInfo.chain_id,
        block_height: blockInfo.block_height,
        address_from: txInfo.From,
        address_to: txInfo.To,
        params: txInfo.params,
        method: txInfo.Method,
        block_hash: blockInfo.block_hash,
        increment_id: txInfo.IncrementId,
        quantity: 0
    };
    switch(method) {
        case 'Initialize':
            // 查支出时，需要排除掉method=Initialize这种情况。
            output.params_to = address_from;
            output.quantity = params[2];
            break;
        case 'Transfer':
            output.params_to = params[0];
            output.quantity = params[1];
            break
        default: ;
    }
    return output;
}


function contractFormat(transaction) {
    // contract_address, tx_id, symbol, name, total_supply, decimals
    if (transaction.Method === 'Initialize') {
        let params = transaction.params.split(', ');
        return {
            contract_address: transaction.To,
            tx_id: transaction.TxId,
            symbol: params[0],
            name: params[1],
            total_supply: params[2],
            decimals: params[3]
        }
    }
    return false;
}

/**
 * 批量插入交易
 *
 * @method insertTransactions
 * @param {Array} transactions
 * @param {Object} database
 * @param {String} table
 */
// insertTransactions(txs, aelf0, 'transactions_0');
function insertTransactions(transactions, database, table) {
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

    let output = [];

    transactions.map(item => {
        for (let each in item) {
            values.push(item[each]);
        }

        if (item.method === 'Initialize') {
        	output = insertContract(item, database, 'contract_aelf20');
            // insertContract(item, database, 'contract_aelf20');
        }

        valuesStr.push(`(${valuesBlank.join(',')})`);
    });
    valuesStr = valuesStr.join(',');
    // console.log('sh:::::::::: ', `insert into ${table} ${keysStr} VALUES ${valuesStr};`);
    // console.log('values:: ', values);
	output.push({
		database: database,
    	sql: `insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE tx_id=VALUES(tx_id);`,
    	values: values
    });
    return output;

    // return mysqlQuery(database, `insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE tx_id=VALUES(tx_id);`, values);
    // database.query(`insert into ${table} ${keysStr} VALUES ${valuesStr} ON DUPLICATE KEY UPDATE tx_id=VALUES(tx_id);`, values, function (err) {
    //     console.log('insertTransactions err: ', err);
    // });
}

/**
 * 插入区块信息
 *
 * @method blockInfoFormatted
 * @param {Object} blockInfoFormatted
 * @param {Object} database
 * @param {String} table
 */
// insertBlock(blockInfoFormatted, aelf0, 'blocks_0');
function insertBlock(blockInfoFormatted, database, table) {
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
    let valuesBlankStr = `(${valuesBlank.join(',')})`;

    let values = [];
    for (let each in blockInfoFormatted) {
        values.push(blockInfoFormatted[each]);
    }

    return [
    	{
    		database: database,
    		sql: `insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);`,
    		values: values
    	}
    ]

    // return mysqlQuery(database, `insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);`, values);

    // database.query(`insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);`, values, function (err) {
    //     console.log('insertBlock err:', err);
    // });
}

function insertContract(transaction, database, table) {
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

    return [
    	{
    		database: database,
    		sql: `insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE contract_address=VALUES(contract_address);`,
    		values: values
    	}
    ];
    // return mysqlQuery(database, `insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE contract_address=VALUES(contract_address);`, values);
    // database.query(`insert into ${table} ${keysStr} VALUES ${valuesBlankStr} ON DUPLICATE KEY UPDATE contract_address=VALUES(contract_address);`, values, function (err) {
    //     console.log('insertContract error: ', err);
    // });
}

let aelf = new Aelf(new Aelf.providers.HttpProvider("http://localhost:1234/chain"));
aelf.chain.connectChain();
let wallet = Aelf.wallet.getWalletByPrivateKey('f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71');
var aelf0 = rds(config.mysql.aelf0);
async function scanBlock() {
    // let tokenc = aelf.chain.contractAt('0x358d01d001cd97775e7b7f32fd03f7f28c0a', wallet);

    // console.log(aelf.chain);

	let before = new Date().getTime();

	// 我的mbp, egg和node都在本机，200毫秒上下

	// let result = '';
	// for (let i = 0; i< 100; i++) {
	aelf0.query('select block_height from transactions_0 ORDER BY block_height DESC limit 1', [], async function (error, result, fields) {
		// }
		let blockHeightInDataBase = 0;
		if (result && result[0] && result[0].block_height) {
		    blockHeightInDataBase = parseInt(result[0].block_height, 10);
		}
		let blockHeightInChain = parseInt(aelf.chain.getBlockHeight().result.block_height, 10);
		let blockHeight = 0;

		let beforeGetInfo = new Date().getTime();

		let blockInfo = aelf.chain.getBlockInfo(blockHeight, true);

		// let transactions = blockInfo.result.Body.Transactions;
		let beforeGetTx = new Date().getTime();
		// aelf.chain.getTxResult('0xe31f8a905725456f083996960ca16de1217da2556c31137bd4c15b2f8aa2d1a5', (err, result) => {
		//   console.log('异步1: ', result);
		// });
		// aelf.chain.getTxResult('0xe31f8a905725456f083996960ca16de1217da2556c31137bd4c15b2f8aa2d1a5', (err, result) => {
		//   console.log('异步2: ', result);
		// });
		// aelf.chain.getTxResult('0xe31f8a905725456f083996960ca16de1217da2556c31137bd4c15b2f8aa2d1a5', (err, result) => {
		//   console.log('异步3: ', result);
		// });
		// aelf.chain.getTxResult('0xe31f8a905725456f083996960ca16de1217da2556c31137bd4c15b2f8aa2d1a5', (err, result) => {
		//   console.log('异步4: ', result);
		// });

		// insert into blocks_0 (block_hash,pre_block_hash,chain_id,block_height,tx_count,merkle_root_tx,merkle_root_state,time) VALUES ('test011','223','1',1,2333,'mrt','mrs','2018-08-05 14:20:54') ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);
		let errorList = [];
		// let transactionsTemp = [];
		let limit = 100;
		// let max = blockHeightInDataBase + limit;
		let max = 18;
		console.log('blockHeightInDataBase, max', blockHeightInDataBase, ' || ', blockHeightInChain);
		if (blockHeightInDataBase >= blockHeightInChain) {
		    return;
		}

		// N1 ~ N2 个一组，可配置。 默认值100个。
		// 用定时器来检查，如果一个请求和入库都处理完了，请求下一批。
		// 其中抛出异常的区块，全部都记录在案，下一次再处理。
		// 异常测试： output.params_to = output.address_from;  通过删除右侧的output.

		for (let i = blockHeightInDataBase; i <= max; i++) {
		    // 批量查询有了之后，批量拿到信息，然后合并数据走事务插入。
		    // aelf.chain.getBlockInfo(i, true, async (err, result) => {
		    aelf.chain.getBlockInfo(i, true, async (err, result) => {
		        // let tran = await aelf0.beginTransaction(error => {
		        aelf0.beginTransaction(async (error) => {

		            // console.log('beginTransaction: ', error);

			        // try {
			            let blockInfo = result.result;

			            // let insertBlocks0 = 'insert into blocks_0 (block_hash,pre_block_hash,chain_id,block_height,tx_count,merkle_root_tx,merkle_root_state,time) VALUES ('test011','223','1',1,2333,'mrt','mrs','2018-08-05 14:20:54') ON DUPLICATE KEY UPDATE block_hash=VALUES(block_hash);'

			            let transactions = blockInfo.Body.Transactions;

			            let blockInfoFormatted  = blockInfoFormat(blockInfo);

			            console.log('block_hash: ', blockInfoFormatted.block_hash, ' || ', i);

			            let transactionsDetail = [];
			            let transactionsSql = [];
			            // console.log('transactions.length', transactions.length);
			            if (transactions.length) {
			                for (let i = 0, j = transactions.length; i < j; i++) {
			                    // transactionsDetail.push(await aelf.chain.getTxResult(transactions[i]));
			                    let transaction = await aelf.chain.getTxResult(transactions[i]).result;
			                    transaction = transactionFormat(transaction, blockInfoFormatted);
			                    transactionsDetail.push(transaction);
			                }
			                transactionsSql = insertTransactions(transactionsDetail, aelf0, 'transactions_0');
			            }

			            let blocksSql = insertBlock(blockInfoFormatted, aelf0, 'blocks_0');
			            let sql = transactionsSql.concat(blocksSql);

			            const promises = sql.map(item => {
			            	return mysqlQuery(item.database, item.sql, item.values);
			            });

			            Promise.all(promises).then(reuslt => {

			            	aelf0.commit();

			            }).catch(err => {
							aelf0.rollback();

							let file = "./error.json";
							let result = JSON.parse(fs.readFileSync(file));
							result = result || {
								list: []
							};

							console.log('[error]rollback: ', result, i, err);

							result.list.push(i);
							fs.writeFileSync(file, JSON.stringify(result));
			            })

			            // console.log('output: ', output);
			            // console.log(output1.concat(output2));

			            // await tran.commit();
			            // console.log(`transactions${i}: `, transactionsDetail, blockInfoFormatted);
			        // } catch (e) {
			        //     aelf0.rollback();
			        //     errorList.push(blockHeightInDataBase);
			        //     // 错误日志记录
			        //     console.log('getBlockInfo::: ', e, errorList);
			        // }
		        });
		    });
		    // let transactions = blockInfo.result.Body.Transactions;
		    // transactionsTemp.push(transactions);
		}
		// console.log('errrrrrrrrrrrorrrrrr::: ', errorList);

		let after = new Date().getTime();

		// 问：如何保证一个块中的所有的交易都插到了库里。
		let tx_id = Math.random();
    });
}

scanBlock();
// setInterval(function () {
//     scanBlock();
// }, 5000);
