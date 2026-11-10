const { Client } = require('ssh2');
const mysql = require('mysql2/promise');

const config = {
    ssh: {
        host: '192.168.1.66',
        port: 22,
        username: 'tcf',
        password: 'nevergiveup'
    },
    db: {
        host: '127.0.0.1',
        user: 'root',
        password: 'nevergiveup',
        database: 'glpidb'
    }
};

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    conn.forwardOut('127.0.0.1', 12345, '127.0.0.1', 3306, async (err, stream) => {
        if (err) {
            console.error('ForwardOut Error:', err);
            conn.end();
            return;
        }
        console.log('Stream ready, connecting to mysql...');
        try {
            const mysqlDb = await mysql.createConnection({
                ...config.db,
                stream
            });
            console.log('MySQL connected!');
            const [rows] = await mysqlDb.query('SHOW TABLES');
            console.log('Tables:', rows.length);
            await mysqlDb.end();
        } catch (e) {
            console.error('MySQL Error:', e);
        }
        conn.end();
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect(config.ssh);
