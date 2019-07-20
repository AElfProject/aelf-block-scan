/**
 * @file deserializeParams.js
 * @author huangzongzhe
 *
 * 根据调用contract的情况来选择不同的proto来反序列化。
 */
const AElf = require('aelf-sdk');
const utils = AElf.utils;
const protobuf = AElf.pbjs;
const tokenContractPb = require('../../proto/token_contract.proto.json');
const tokenContractRoot = protobuf.Root.fromJSON(tokenContractPb);
const tokenConverterContractPb = require('../../proto/token_converter_contract.proto.json');
const tokenConverterContractRoot = protobuf.Root.fromJSON(tokenConverterContractPb);
const Long = require('long'); // For Token Contract
let {
  config
} = require('../../config/configInit');

module.exports = function (params, contractAddress, options = {}) {
  let output = '';
  // if (txResult.Transaction) {
  // const params = txResult.Transaction.Params || '';
  const bufferTemp = Buffer.from(params, 'base64');
  if (contractAddress === config.defaultContracts.token) {
    const method = (options.method || '').toLocaleLowerCase();
    let result = '';
    switch (method) {
      case 'create':
        result = tokenContractRoot.nested.token.CreateInput.decode(bufferTemp);
        result.issuer = utils.encodeAddressRep(result.issuer.Value.toString('hex'));
        result.totalSupplyStr = (new Long(result.totalSupply)).toString();
        break;
      case 'transfer':
        result = tokenContractRoot.nested.token.TransferInput.decode(bufferTemp);
        const addressTo = utils.encodeAddressRep(result.to.Value.toString('hex'));
        result.to = addressTo;
        result.amountStr = (new Long(result.amount)).toString();
        break;
      default:
        break;
    }
    // result.constructor === TransferInput
    // when JSON.stringify result.to = {}
    // and result.amount will be the result of 'long.toString()'
    // so we need {...result}
    output = {
      ...result
    };
  } else if (contractAddress === config.defaultContracts.tokenConverter) {
    const method = (options.method || '').toLocaleLowerCase();
    let result = '';
    switch (method) {
      case 'initialize':
        result = tokenConverterContractRoot.InitializeInput.decode(bufferTemp);
        break;
      case 'buy':
        result = tokenConverterContractRoot.BuyInput.decode(bufferTemp);
        result.amountStr = (new Long(result.amount)).toString();
        break;
      case 'sell':
        result = tokenConverterContractRoot.SellInput.decode(bufferTemp);
        result.amountStr = (new Long(result.amount)).toString();
        break;
      default:
        break;
    }
    output = {
      raw: params,
      json: {
        ...result
      }
    };
  }
  // }
  return output;
};
