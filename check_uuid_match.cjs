const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const stream = conn.exec('sudo -u postgres psql -d network_monitor_db', (err, ch) => {
        ch.on('data', d => console.log(d.toString()));
        ch.on('close', () => conn.end());
        ch.write(`
        -- Check DESKTOP-4O314L4 asset row
        SELECT id, name, inventory_number, uuid, agent_status, last_agent_sync FROM assets WHERE id = 788;

        -- Check how many assets have UUID with suffixes like -XXXX
        SELECT count(*) FROM assets WHERE uuid ~ '-[0-9A-Fa-f]{4}$';

        -- Check sample UUIDs in DB
        SELECT id, name, uuid, agent_status, last_agent_sync FROM assets WHERE uuid IS NOT NULL LIMIT 15;
        \\q
        `);
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});
