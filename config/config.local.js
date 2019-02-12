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
    network: 'http://192.168.199.210:5000/chain'
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
        database: 'aelf_test_minghui',
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

module.exports = {
    mysql: mysql,
    scanTimeInterval: 4000,
    scanLimit: 5,
    restartTimeInterval: 60000, // 1000 * 60 * 1
    restartScanMissingListLimit: 3,
    initTPSAcquisition: false,
    // scanLimit: 12,
    log4js: log4js,
    resourceContractAddress: 'ELF_4CBbRKd6rkCzTX5aJ2mnGrwJiHLmGdJZinoaVfMvScTEoBR',
    aelf: aelf
};
