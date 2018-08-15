let mysql = {
	aelf0: {
		host: 'localhost',
		// 端口号
		port: '3306',
		// 用户名
		user: '',
		// 密码
		password: '',
		// 数据库名
		database: '',
	}
};

let log4js = {
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
	scanTimeInterval: 10000,
	scanLimit: 100,
	log4js: log4js,
	aelf: {}
};