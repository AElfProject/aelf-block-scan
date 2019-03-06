/**
 * @file config.local.js
 * @author huangzongzhe
 */
const aelf = {
    commonPrivateKey: 'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71',
    // the rpc URL of the AElf Chain Node.
    network: 'http://localhost:1234/chain'
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

module.exports = {
    mysql: mysql,
    scanTimeInterval: 4000,
    scanLimit: 20,
    restartTimeInterval: 60000, // 1000 * 60 * 1
    restartScanMissingListLimit: 3,
    removeUnconfirmedDataInterval: 240000, // 1000 * 60 * 4
    initTPSAcquisition: false,
    // if !!resourceContractAddress === false, we will not acquisite resource.
    resourceContractAddress: 'ELF_47dpXA3aEuDj9yeq9Et2E4zjPrSs4uQpzdFkYuBZEEQmob',
    // scanLimit: 12,
    log4js: log4js,
    aelf: aelf
};

