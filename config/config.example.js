/**
 * @file config.local.js
 * @author huangzongzhe
 */
const aelf = {
    commonPrivateKey: 'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71',
    // the rpc URL of the AElf Chain Node.
    network: [
        'http://192.168.197.56:8101/chain',
        null,
        null,
        null,
        [{
            name: 'Accept',
            value: 'text/plain;v=1.0'
        }]
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
    token: '4rkKQpsRFt1nU6weAHuJ6CfQDqo6dxruU3K3wNUFr6ZwZYc',
    resource: '4QjhKLWacRXrQYpT7rzf74k5XZFCx8yF3X7FXbzKD4wwEo6'
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
