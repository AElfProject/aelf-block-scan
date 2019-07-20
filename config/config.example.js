/**
 * @file config.local.js
 * @author huangzongzhe
 */
const AElf = require('aelf-sdk');
const commonPrivateKey = 'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71';
const commonWallet = AElf.wallet.getWalletByPrivateKey(commonPrivateKey);

const aelf = {
    commonPrivateKey,
    commonWallet,
    // the rpc URL of the AElf Chain Node.
    network: [
        'http://34.213.112.35:8000' // AElf test net
        // ,
        // null,
        // null,
        // null,
        // [{
        //     name: 'Accept',
        //     value: 'text/plain;v=1.0'
        // }]
    ]
};

const mysql = {
    aelf0: {
        // host
        // host: 'mysql.com',
        host: '127.0.0.1',
        // 端口号
        port: '3306',
        // 用户名
        user: 'normal_aelf',
        // 密码
        password: 'password',
        // 数据库名
        database: 'aelf_test',
        // 链接池 链接上限
        connectionLimit: 100
    }
};

const log4js = {
    appenders: {
        scan: {
            type: 'file',
            filename: './log/scan.log'
        }
    },
    categories: {
        default: {
            appenders: ['scan'],
            level: 'error'
        }
    }
};

const dbTable = {
    confirmedSuffix: '_0',
    unconfirmedSuffix: '_unconfirmed',
    unConfirmedTables: ['blocks', 'transactions', 'resource']
};

const defaultContracts = {
    // Token合约可以通过getContractAddressByName来获取
    token: 'WnV9Gv3gioSh3Vgaw8SSB96nV8fWUNxuVozCf6Y14e7RXyGaM',
    resource: 'Acv7j84Ghi19JesSBQ8d56XenwCrJ5VBPvrS4mthtbuBjYtXR',
    tokenConverter: 'Acv7j84Ghi19JesSBQ8d56XenwCrJ5VBPvrS4mthtbuBjYtXR'
};

module.exports = {
    mysql: mysql,
    dbTable,
    scanTimeInterval: 4000,
    scanLimit: 20,
    restartTimeInterval: 60000, // 1000 * 60 * 1
    restartScanMissingListLimit: 3,
    criticalBlocksCounts: 60,
    removeUnconfirmedDataInterval: 240000, // 1000 * 60 * 4
    initTPSAcquisition: false,
    log4js: log4js,
    aelf: aelf,
    defaultContracts
};
