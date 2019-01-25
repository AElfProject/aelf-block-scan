/**
 * @file format
 * @author huangzongzhe
 * 2018.08
 */

/* eslint-disable fecs-camelcase */
module.exports = {
    blockInfoFormat: blockInfoFormat,
    transactionFormat: transactionFormat,
    contractFormat: contractFormat
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

/**
 * 对标数据库，重新格式交易数据
 *
 * @param {Object} transaction 交易数据
 * @param {Object} blockInfo 区块数据
 * @return {Object} output
 */
function transactionFormat(transaction, blockInfo, contractAddressList) {
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
        block_height: parseInt(blockInfo.block_height, 10),
        address_from: txInfo.From,
        address_to: txInfo.To,
        params: txInfo.params,
        method: txInfo.Method,
        block_hash: blockInfo.block_hash,
        increment_id: parseInt(txInfo.IncrementId, 10) || 0,
        quantity: 0, // TODO: 链上为BigInt类型, 所有涉及交易的步骤后续都需要修改。
        tx_status: transaction.tx_status,
        time: blockInfo.time
    };

    // 这一套规则是针对token合约的。
    if (txInfo.To === contractAddressList.token) {
        switch (method) {
            case 'Initialize':
                // 查支出时，需要排除掉method=Initialize这种情况。
                output.params_to = output.address_from;
                output.quantity = params[2] || 8012780666233;
                break;
            case 'Transfer':
                output.params_to = params[0];
                output.quantity = params[1] || 8012780666233;
                break;
            case 'InitialBalance':
                output.params_to = params[0];
                output.quantity = params[1] || 8012780666233;
                break;
        }
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
function contractFormat(transaction) {
    // contract_address, tx_id, symbol, name, total_supply, decimals
    if (transaction.Method === 'Initialize') {
        let params = transaction.params.split(', ');
        return {
            contract_address: transaction.To,
            tx_id: transaction.TxId,
            symbol: params[0],
            name: params[1],
            total_supply: params[2], // TODO: BigInt
            decimals: params[3]
        };
    }

    return false;
}
