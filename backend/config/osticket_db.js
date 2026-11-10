const mysql = require('mysql2/promise');

const ostPool = mysql.createPool({
    host: '192.168.1.18',
    user: 'power_asset',
    password: 'nevergiveup',
    database: 'osticket_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000
});

ostPool.on('connection', (connection) => {
    // console.log('Connected to osTicket DB');
});

ostPool.on('error', (err) => {
    console.error('osTicket DB Pool Error:', err);
});

module.exports = ostPool;
