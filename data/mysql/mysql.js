// Access MySQL via node-mysql
// https://github.com/felixge/node-mysql
function accessSQL() {
    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host : 'localhost',
        user : 'user',
        password : 'pw',
        database : 'db',
        socketPath : '/var/run/mysqld/mysqld.sock', // socket for communication from debian <-> client, seems not to be set correcly by default?
    });

    connection.connect();
    var json = '';
    var query = 'SELECT * FROM test';
    connection.query(query, function(err, results, fields) {
        if (err) {
            console.log('ERROR:', err);
            return;
        }

        console.log('The query-result is: ', results[0]);

        // wrap result-set as json
        json = JSON.stringify(results);

        connection.end();
        console.log('JSON-result:', json);
    });
}

accessSQL();
