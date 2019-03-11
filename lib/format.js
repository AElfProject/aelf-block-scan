/**
 * @file format
 * @author huangzongzhe
 * 2018.08
 */

/* eslint-disable fecs-camelcase */
module.exports = {
    blockInfoFormat: blockInfoFormat,
    transactionFormat: transactionFormat
    // contractFormat: contractFormat
};

/**
 * 对标数据库，重新格式区块数据
 *
 * @param {Object} blockInfo 区块信息
 * @return {Object} output
 */
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
        block_hash: blockInfo.BlockHash,
        pre_block_hash: header.PreviousBlockHash,
        chain_id: header.ChainId,
        block_height: header.Height,
        tx_count: body.TransactionsCount,
        merkle_root_tx: header.MerkleTreeRootOfTransactions,
        merkle_root_state: header.MerkleTreeRootOfWorldState,
        time: header.Time // format 2018-08-03 17:26:03
    };
    return output;
}

/**
 * 对标数据库，重新格式交易数据
 *
 * @param {Object} transaction 交易数据
 * @param {Object} blockInfo 区块数据blockInfoFormatted
 * @param {Array} contractAddressList 合约地址列表
 * @return {Object} output
 */
function transactionFormat(transaction, blockInfo, contractAddressList) {
    let txInfo = transaction.Transaction;
    // 处理一些奇怪的返回
    // TODO: 将token合约的数据从transaction中备份一份出来。。。
    if (typeof txInfo === 'string') {
        return {
            tx_id: 'tx_id' + new Date().getTime() + Math.ceil(Math.random() * 100),
            params_to: 'params_to' + new Date().getTime() + Math.ceil(Math.random() * 500),
            chain_id: blockInfo.chain_id,
            block_height: parseInt(blockInfo.block_height, 10),
            address_from: '',
            address_to: '',
            params: txInfo,
            method: '',
            block_hash: blockInfo.block_hash,
            // increment_id: 0,
            quantity: 0, // TODO: 链上为BigInt类型, 所有涉及交易的步骤后续都需要修改。
            tx_status: transaction.Status,
            time: blockInfo.time,
            logs: transaction.Logs
        };
    }

    let method = txInfo.MethodName;
    // {
    //   "tx_status": "Mined",
    //   "tx_info": {
    //   "TxId": "0x554ecbc61102471f65bcc32550f7fddddba7cb90a8f4c3620e79593d7795a942",
    //   "From": "0x04beb6b3aae09d4ae3b457e9a3066e08519f",
    //   "To": "0x52b297074b3fbcd9be2b9feed931b95917bc",
    //   "Method": "InitializeAElfDPoS",
    //   "IncrementId": 0,
    //   "params": {
    //          amount:"100"
    //          to: "58h3RwTfaE8RDpRNMAMiMv8jUjanCeYHBzKuQfHbrfSFTCn"
    //      }
    //   },
    //   "return": "0x"
    // }
    // 字段搞不清命名的话，去这个规范瞅。
    // http://www.szse.cn/main/files/2015/09/01/深圳证券交易所STEP交易数据接口规范1.00.pdf
    // tx_id, params_to, chain_id, block_height, address_from, address_to, params, method, block_hash, increment_id, quantity(qty)
    // 一定要按数据库里字段的顺序排，后面的insertTransactions按这个顺序拼接的数据
    let output = {
        tx_id: transaction.TransactionId,
        params_to: '',
        chain_id: blockInfo.chain_id,
        block_height: parseInt(blockInfo.block_height, 10),
        address_from: txInfo.From,
        address_to: txInfo.To,
        params: '', // JSON.stringify(txInfo.Params),
        method: txInfo.MethodName,
        block_hash: blockInfo.block_hash,
        // increment_id: parseInt(txInfo.IncrementId, 10) || 0,
        // increment_id: 0,
        quantity: 0, // TODO: 链上为BigInt类型, 所有涉及交易的步骤后续都需要修改。
        tx_status: transaction.Status,
        time: blockInfo.time,
        logs: transaction.Logs
    };

    // 这一套规则是针对token合约的。
    const tokenMethodCheck = ['Initialize', 'Transfer', 'InitialBalance'].includes(txInfo.MethodName);

    if (txInfo.To === contractAddressList.resource) {
        output.params = JSON.stringify(txInfo.Params);
    }
    else if (txInfo.To === contractAddressList.token && tokenMethodCheck) {
        const params = txInfo.Params;
        output.params = JSON.stringify(txInfo.Params);
        switch (method) {
            case 'Initialize':
                // 查支出时，需要排除掉method=Initialize这种情况。
                output.params_to = txInfo.To;
                output.quantity = params.totalSupply || 8012780666233;
                break;
            case 'Transfer':
                output.params_to = params.to;
                output.quantity = params.amount || 8012780666233;
                break;
            // case 'InitialBalance':
            //     output.params_to = params[0];
            //     output.quantity = params[1] || 8012780666233;
            //     break;
        }
        output.quantity = parseInt(output.quantity, 10);
    }
    return output;
}

/**
 * 对标数据库，获取格式化后的合约信息。仅限于token合约，
 *
 * @method contractFormat
 * @param {Object} transaction 单个交易数据
 * @return {boolean} true/false
 */
// function contractFormat(transaction) {
//     // contract_address, tx_id, symbol, name, total_supply, decimals
//     if (transaction.Method === 'Initialize') {
//         let params = transaction.params.split(', ');
//         return {
//             contract_address: transaction.To,
//             tx_id: transaction.TxId,
//             symbol: params[0],
//             name: params[1],
//             total_supply: params[2], // TODO: BigInt
//             decimals: params[3]
//         };
//     }

//     return false;
// }
