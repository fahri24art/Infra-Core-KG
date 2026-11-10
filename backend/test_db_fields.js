const mysql = require('mysql2/promise');

async function run() {
    const ostPool = mysql.createPool({
        host: '192.168.1.18',
        user: 'power_asset',
        password: 'nevergiveup',
        database: 'osticket_db',
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        const [rows] = await ostPool.query('SHOW COLUMNS FROM ost_ticket');
        console.log("ost_ticket columns:");
        rows.forEach(r => console.log(r.Field));

        const [tables] = await ostPool.query('SHOW TABLES LIKE "%dept%"');
        console.log("Department tables:", tables);
    } catch (e) {
        console.error(e);
    } finally {
        ostPool.end();
    }
}
run();
