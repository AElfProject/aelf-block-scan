/**
 *  @file formatResourceDetail.js
 *  @author huangzongzhe
 */
/* eslint-disable fecs-camelcase */
// const deserializeParams = require('../lib/protobuf/deserializeParams');
const deserializeEvents = require('../lib/protobuf/deserializeEvents');
const Long = require('long');

function formatResourceDetail(input) {
  const {
    params
  } = input;

  // const paramsDeserialized = deserializeParams(params, input.address_to, {
  //     method: input.method
  // });
  const paramsObject = JSON.parse(params);
  const eventsDeserialized = deserializeEvents(input.logs);
  const tradeDetail = eventsDeserialized.find(item => item.name === 'tokenTrade');

  let output = {
    tx_id: input.tx_id,
    address: input.address_from,
    method: input.method,
    chain_id: input.chain_id,
    block_height: input.block_height,
    tx_status: input.tx_status,
    time: (new Date(input.time)).getTime(),
    type: paramsObject.symbol || '',
    resource: parseInt(paramsObject.amount || 0, 10),
    elf: tradeDetail && (new Long(tradeDetail.baseAmount)).toString() || 0,
    fee: tradeDetail && (new Long(tradeDetail.feeAmount)).toString() || 0
  };
  return output;
}

module.exports = {
  formatResourceDetail
};
