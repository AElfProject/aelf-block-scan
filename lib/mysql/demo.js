// 原始的mysql库
var mysql = require('mysql');
var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'example.org',
  user            : 'bob',
  password        : 'secret',
  database        : 'my_db'
});

// his is a shortcut for the pool.getConnection() -> connection.query() -> connection.release() code flow. 
// Using pool.getConnection() is useful to share connection state for subsequent queries. 
// This is because two calls to pool.query() may use two different connections and run in parallel. This is the basic structure:
pool.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
  if (error) throw error;
  console.log('The solution is: ', results[0].solution);
});


pool.getConnection(function(err, connection) {
  if (err) throw err; // not connected!

  // Use the connection
  connection.query('SELECT something FROM sometable', function (error, results, fields) {
    // When done with the connection, release it.
    connection.release();

    // Handle error after the release.
    if (error) throw error;

    // Don't use the connection here, it has been returned to the pool.
  });
});