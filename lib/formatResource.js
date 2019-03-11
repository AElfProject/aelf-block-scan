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

// function buf2hex(buffer) {
//     // buffer is an ArrayBuffer
//     return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
// }
// input = transactionFormatted
function formatResourceDetail(input) {
    let typeFlag;
    let PBType;
    let elfKey;
    let resourceKey;
    const {method} = input;
    if (method === 'BuyResource') {
        typeFlag = 'vbO9fvBIjYylL6liJbZ3gWimtF4+kKTt0+s9Mt+CAiA=';
        PBType = resourceBought;
        elfKey = 'paidelf';
        resourceKey = 'receivedresource';
    }
    else if (method === 'SellResource') {
        typeFlag = 'SwtRBsS+QStY6yE4JWGTfzBNZxOr8Mks9R7rtoRg/BY=';
        PBType = resourceSold;
        elfKey = 'receivedelf';
        resourceKey = 'paidresource';
    }

    const typeMap = {
        'dgzQmHhlSc55xv6S37HxGJPRajNL0e3uZwSxlNEzZpM=': 'Cpu',
        'SCzx23XJfMJ5ZdguGk36fzbf0C+t1TmRQEILCQtv8ac=': 'Ram',
        '5R+OQytjMblcXhZp1GBO9QcYCAHcw7hdP8plCcWMYMo=': 'Net',
        'DrmdTV6USdPSNxvdowcjxWG8Aiw2Hus2WHgPX78BxvI=': 'Sto'
    };

    const logs = input.logs || [];
    const resourceDetail  = logs.find(log => {
        return log.Topics[0] === typeFlag;
    });
    let output = {
        tx_id: input.tx_id,
        address: input.address_from,
        method: input.method,
        chain_id: input.chain_id,
        block_height: input.block_height,
        tx_status: input.tx_status,
        time: (new Date(input.time)).getTime(),
        type: '',
        resource: 0,
        elf: 0,
        fee: 0
    };
    if (resourceDetail) {
        const resourceType = typeMap[resourceDetail.Topics[1]];
        const data = resourceDetail.Data;
        const dataHex = Buffer.from(data, 'base64').toString('hex');
        const bufferTemp = hexToArrayBuffer(formatHexData(dataHex));
        const resultTemp = PBType.deserializeBinary(bufferTemp);
        const result = resultTemp.toObject();

        output = {
            ...output,
            // tx_id: input.tx_id,
            // address: input.address_from,
            // method: input.method,
            type: resourceType,
            resource: result[resourceKey],
            elf: result[elfKey],
            // 使用fee时，需要 / 1000, 这里是为了方便储存
            // Need / 1000 when use fee, this one is for storage.
            fee: result[elfKey] * 5
            // chain_id: input.chain_id,
            // block_height: input.block_height,
            // tx_status: input.tx_status,
            // time: input.time
        };
        return output;
    }
    return {
        // tx_id: input.tx_id,
        // address: input.address_from,
        // method: input.method,
        type: 'null',
        resource: 'null',
        elf: 'null',
        fee: 'null',
        ...output
        // chain_id: input.chain_id,
        // block_height: input.block_height,
        // tx_status: input.tx_status,
        // time: input.time
    };
}

module.exports = {
    formatResourceDetail
};
