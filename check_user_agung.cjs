const { Client } = require('ssh2');

const c = new Client();
c.on('ready', () => {
    const sql = `PGPASSWORD=secure_net_pass psql -U netadmin -h 127.0.0.1 -d network_monitor_kg -c "SELECT id, name, username, role, department FROM users WHERE username IS NOT NULL OR password IS NOT NULL;"`;
    c.exec(sql, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => console.log('KG LOGIN USERS:\n', d.toString()));
        stream.on('close', () => {
            const sql2 = `PGPASSWORD=secure_net_pass psql -U netadmin -h 127.0.0.1 -d network_monitor_db -c "SELECT id, name, username, role, department FROM users WHERE username IS NOT NULL OR password IS NOT NULL;"`;
            c.exec(sql2, (err2, stream2) => {
                if (err2) throw err2;
                stream2.on('data', d => console.log('SG LOGIN USERS:\n', d.toString()));
                stream2.on('close', () => {
                    c.end();
                    process.exit(0);
                });
            });
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'Nevergiveup572*' });
