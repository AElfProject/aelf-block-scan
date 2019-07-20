/*
 * huangzongzhe
 * 2018.09.04
 * promise 化query操作
 */
// pool is also ok.
let beginTransaction = function (connection) {
  return new Promise((resolve, reject) => {
    connection.beginTransaction(function (err) {
      if (err) {
        reject(err);
      }
      resolve(connection);
    });
  });
};

module.exports = {
  beginTransaction: beginTransaction
};

// Transaction
// connection.beginTransaction(function(err) {
//   if (err) { throw err; }
//   connection.query('INSERT INTO posts SET title=?', title, function (error, results, fields) {
//     if (error) {
//       return connection.rollback(function() {
//         throw error;
//       });
//     }

//     var log = 'Post ' + results.insertId + ' added';

//     connection.query('INSERT INTO log SET data=?', log, function (error, results, fields) {
//       if (error) {
//         return connection.rollback(function() {
//           throw error;
//         });
//       }
//       connection.commit(function(err) {
//         if (err) {
//           return connection.rollback(function() {
//             throw err;
//           });
//         }
//         console.log('success!');
//       });
//     });
//   });
// });
