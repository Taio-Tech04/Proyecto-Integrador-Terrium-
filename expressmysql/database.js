const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'test_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;