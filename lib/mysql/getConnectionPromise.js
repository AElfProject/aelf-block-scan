/**
 * @file getConnectionPromise.js
 * @author huangzongzhe
 * 2018.09.04
 */

let getConnectionPromise = function (pool) {
  return new Promise((resolve, reject) => {
    pool.getConnection(function (err, connection) {
      if (err) {
        reject(err);
      }
      resolve(connection);
    });
  });
};

module.exports = {
  getConnectionPromise
};
