/**
 *  @file formatResourceDetail.js
 *  @author huangzongzhe
 */
/* global Uint8Array */
/* eslint-disable fecs-camelcase */
const resourcePB = require('../proto/resource_pb.js');
const resourceBought = resourcePB.ResourceBought;
const resourceSold = resourcePB.ResourceSold;

const formatHexData = require('../utils/formatHexData');
const hexToArrayBuffer = require('../utils/hexToArrayBuffer');

const AElf = require('aelf-sdk');
const protobuf = AElf.pbjs;
const tokenContractDescriptor = require('../proto/token_contract.proto.json');
const tokenContractRoot = protobuf.Root.fromJSON(tokenContractDescriptor);
// TODO: aelf-sdk输出
const utils = require('../node_modules/aelf-sdk/lib/utils/utils');
// function buf2hex(buffer) {
//     // buffer is an ArrayBuffer
//     return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
// }
// input = transactionFormatted
function formatResourceDetail(input) {
    // let typeFlag;
    // let PBType;
    // let elfKey;
    // let resourceKey;
    // const {method} = input;

    // const {logs} = input;
    // logs.map(item => {
    //     const {
    //         Indexed,
    //         NonIndexed
    //     } = item;
    //     const stringBase64 = Indexed.join('') + NonIndexed;
    //     const transferred = tokenContractRoot.nested.token.Transferred.decode(
    //         Buffer.from(stringBase64, 'base64')
    //     );

    //     // TODO: 等光磊加上能获取交易消耗的ELF和手续费的Event了。
    //     // message Transferred {
    //     //     option(aelf.is_event) = true;
    //     //     Address from = 1[(aelf.is_indexed) = true];
    //     //     Address to = 2[(aelf.is_indexed) = true];
    //     //     string symbol = 3[(aelf.is_indexed) = true];
    //     //     sint64 amount = 4;
    //     //     string memo = 5;
    //     // }
    //     // 解析示例，没有的，为零的，或者为空的数据，就 undefined了
    //     // Transferred:
    //     // Transferred {
    //     //     from:
    //     //     Address {
    //     //         Value: <Buffer 32 24 6a ad 6c a2 1d be 23 8c 7c 66 82 44 07 5c 13 b0 45 03 38 48 ce 75 fd 63 e4 6e a9 8d>
    //     //     }
    //     // }

    // });
    // params:"{"symbol":"RAM","amount":"101"}"
    const {
        params
    } = input;
    const {
        symbol,
        amount
    } = JSON.parse(params);

    let output = {
        tx_id: input.tx_id,
        address: input.address_from,
        method: input.method,
        chain_id: input.chain_id,
        block_height: input.block_height,
        tx_status: input.tx_status,
        time: (new Date(input.time)).getTime(),
        type: symbol || '',
        resource: parseInt(amount || 0, 10),
        elf: 0,
        fee: 0
    };
    return output;
}

module.exports = {
    formatResourceDetail
};
