/**
 * @file insertInnerToken.js
 * @author huangzongzhe
 */
const {
    insertContract
} = require('../lib/insertPure');
const AElf = require('aelf-sdk');
const sha256 = AElf.utils.sha256;

let {
    config
} = require('../config/configInit');

module.exports = {
    insertInnerToken
};

// 内置交易的token信息
// {
//     symbol: 'ELF',
//     tokenName: 'elf token',
//     supply: '999999998',
//     totalSupply: '1000000000',
//     decimals: 2,
//     issuer: '2gaQh4uxg6tzyH1ADLoDxvHA14FMpzEiMqsQ6sDG5iHT8cmjp8',
//     isBurnable: true
// }
function insertInnerToken(aelf, chainInfo, connection) {
    const {
        GenesisContractAddress,
        ChainId
    } = chainInfo;

    // TODO: SDK 改造成 async await, 不然回调地狱能玩死你。
    aelf.chain.contractAtAsync(GenesisContractAddress, config.aelf.commonWallet, (err, zeroC) => {
        zeroC.GetContractAddressByName.call(sha256('AElf.ContractNames.Token'), (err, address) => {
            aelf.chain.contractAtAsync(address, config.aelf.commonWallet, (err, tokenC) => {
                tokenC.GetTokenInfo.call({
                    symbol: 'ELF'
                }, (err, tokenInfo) => {
                    const input = [
                        address,
                        ChainId,
                        'inner', // tokenInfo.block_hash,
                        'inner', // tokenInfo.tx_id,
                        tokenInfo.symbol, // params.symbol,
                        tokenInfo.tokenName, // params.tokenName,
                        tokenInfo.totalSupply, // params.totalSupplyStr,
                        tokenInfo.decimals // params.decimals
                    ];
                    insertContract(input, connection, 'contract_aelf20');
                });
            });
        });
    });
}
