/**
 * @file resource/index.js
 * @author huangzongzhe
 */
let {
    config
} = require('./config/configInit.js');
const getEstimatedValueELF = require('../utils/getEstimatedValueELF');
const Aelf = require('aelf-sdk');

let aelf = new Aelf(new Aelf.providers.HttpProvider(config.aelf.network));
const {
    commonPrivateKey,
    resourceContractAddress
} = config.aelf;
const commonWallet = Aelf.wallet.getWalletByPrivateKey(commonPrivateKey);
const resourceContract = aelf.chain.contractAt(resourceContractAddress, commonWallet);

getEstimatedValueELF(resourceContract, 'CPU', '???');
