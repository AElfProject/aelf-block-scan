/**
 * @file getContractAddressByName.js
 * @author huangzongzhe
 */
/* eslint-disable fecs-camelcase */
const AElf = require('aelf-sdk');
const Wallet = AElf.wallet;
const sha256 = AElf.utils.sha256;
// address: 2hxkDg6Pd2d4yU1A16PTZVMMrEDYEPR8oQojMDwWdax5LsBaxX
const defaultPrivateKey = 'bdb3b39ef4cd18c2697a920eb6d9e8c3cf1a930570beb37d04fb52400092c42b';
const wallet = Wallet.getWalletByPrivateKey(defaultPrivateKey);

module.exports = function getContractAddressByName(contractName, aelf) {

    const {
        GenesisContractAddress
    } = aelf.chain.getChainStatus();

    const zeroC = aelf.chain.contractAt(GenesisContractAddress, wallet);

    // const tokenContractAddress = zeroC.GetContractAddressByName.call(sha256('AElf.ContractNames.Token')); // HelloWorldContract
    const tokenContractAddress = zeroC.GetContractAddressByName.call(sha256(contractName)); // HelloWorldContract
    return tokenContractAddress;
};
