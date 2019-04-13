/**
 * @file deserializeEvents.js
 * @author huangzongzhe
 *
 * 反序列化 Event的内容。
 * mmp的， 赶紧的等团队稳定了迁移到TS。
 */

const AElf = require('aelf-sdk');
const protobuf = AElf.pbjs;
// const tokenContractPb = require('../../proto/token_contract.proto.json');
const tokenConverterContractPb = require('../../proto/token_converter_contract.proto.json');
// const tokenContractRoot = protobuf.Root.fromJSON(tokenContractPb);
const tokenConverterContractRoot = protobuf.Root.fromJSON(tokenConverterContractPb);

function deserializeEvents(logs) {
    // const logs = txResult.Logs;
    let eventList = [];
    let outputList = [];
    if (logs) {
        eventList = logs.map(item => {
            return {
                name: item.Name,
                base64StrList: [item.NonIndexed, ...(item.Indexed || [])]
            };
        });
        outputList = eventList.map(item => {
            let output = [];
            if (['TokenBought', 'TokenSold'].includes(item.name)) {
                output = item.base64StrList.map(strBase64 => {
                    const dataBuffer = Buffer.from(strBase64, 'base64');
                    const result = tokenConverterContractRoot[item.name].decode(dataBuffer);
                    result.name = 'tokenTrade';
                    return result;
                });
            }
            // useless
            // if (item.name === 'Transferred') {
            //     output = item.base64StrList.map(strBase64 => {
            //         const dataBuffer = Buffer.from(strBase64, 'base64');
            //         // TODO: 如果想解析Address
            //         // const utils = AElf.utils;
            //         // utils.encodeAddressRep(output01.from.Value.toString('hex'));
            //         // utils.encodeAddressRep(output01.to.Value.toString('hex'));
            //         return tokenContractRoot.nested.token.Transferred.decode(dataBuffer);
            //     });
            // }
            let listTemp = {};
            output.map(item => {
                listTemp = {
                    ...listTemp,
                    ...item
                };
            });
            return listTemp;
        });
    }
    return outputList;
}

module.exports = deserializeEvents;
