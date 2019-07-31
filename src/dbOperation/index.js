/**
 * @file db base operations
 * @author atom-yang
 * @date 2019-07-20
 */
const utils = require('../common/utils');

const defaultOption = {
  dbType: 'mysql',
  host: '127.0.0.1',
  port: '3306',
  user: 'normal_aelf',
  password: 'password',
  connectionLimit: 100,
  database: 'aelf_test'
};

class DBBaseOperation {
  constructor(option = defaultOption) {
    this.config = {
      ...defaultOption,
      ...option
    };
  }

  init() {
    throw new Error(utils.noImplementMethodError('init'));
  }

  insert(data) {
    console.log(data);
    throw new Error(utils.noImplementMethodError('insert'));
  }

  destroy() {
    throw new Error(utils.noImplementMethodError('destroy'));
  }
}

module.exports = DBBaseOperation;
