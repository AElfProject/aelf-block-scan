/**
 * @file config.local.js
 * @author huangzongzhe
 */
const aelf = {
    commonPrivateKey: 'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71',
    // the rpc URL of the AElf Chain Node.
    // network: 'http://localhost:1234/chain'
    // network: 'http://34.212.171.27:8000/chain'
    // network: 'http://34.212.171.27:8000/chain'
    // network: 'http://192.168.199.210:5000/chain'
    // network: 'http://192.168.199.109:5000/chain'
    // network: 'http://192.168.197.56:8000/chain'
    // network: 'http://192.168.197.70:8000/chain'
    // network: 'http://192.168.197.56:8101/chain'
    network: 'http://192.168.197.70:8000/chain'
};

const mysql = {
    aelf0: {
        // host
        // host: 'mysql.com',
        host: '127.0.0.1',
        // 端口号
        port: '3306',
        // 用户名
        // user: 'normal_aelf',
        // user: 'normal_aelf_mh',
        user: 'root',
        // user: 'root',
        // 密码
        // password: '',
        // password: 'password',
        password: '',
        // 数据库名
        // database: 'aelf_test',
        // database: 'aelf_test_01',
        // database: 'aelf_test_34_212_171_27',
        // database: 'aelf_test_minghui',
        // database: 'aelf_test_rollback',
        database: 'aelf_test_newchain',
        // database: 'aelf_test_01',
        // database: 'aelf_test_34_212_171_27',
        // database: 'aelf_test_172_31_5_155_8000',
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
    resource: '2Xg2HKh8vusnFMQsHCXW1q3vys5JxG5ZnjiGwNDLrrpb9Mb'
};

module.exports = {
    mysql: mysql,
    dbTable,
    scanTimeInterval: 4000,
    scanLimit: 50,
    restartTimeInterval: 60000, // 1000 * 60 * 1
    restartScanMissingListLimit: 3,
    // removeUnconfirmedDataInterval: 240000, // 1000 * 60 * 4
    criticalBlocksCounts: 60, // 假定的不可回滚块高度。
    removeUnconfirmedDataInterval: 240000, // 1000 * 60 * 4
    initTPSAcquisition: true,
    log4js: log4js,
    aelf: aelf,
    defaultContracts
};
