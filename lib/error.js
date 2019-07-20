/**
 * @file error.js
 * @author huangzongzhe
 * 2018.09.04
 * 错误码，针对不同类型，返回不同错误
 */

// 从链上获取数据报错
// 10000 - 19999
let chainError = {
  code: 10000,
  errType: 'chainError',
  err: undefined,
  result: undefined
};

// 从数据库获取数据报错
// 20000 - 29999
let sqlError = {
  code: 20000,
  errType: 'sqlError',
  err: undefined,
  result: undefined
};

// 程序报错
// 30000 - 39999
let codeError = {
  code: 30000,
  errType: 'codeError',
  err: undefined,
  result: undefined
};

module.exports = {
  chainError: chainError,
  sqlError: sqlError,
  codeError: codeError
};
