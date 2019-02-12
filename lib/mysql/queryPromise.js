/**
 * @file
 * @author huangzongzhe
 * 2018.09.04
 * promise 化query操作
 */
// pool is also ok.
let queryPromise = function (connection, sql, values = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (err, rows) => {
            if (err) {
                // connection.rollback();
                reject(err);
            }
            resolve(rows);
        });
    });
};

module.exports = {
    queryPromise
};
