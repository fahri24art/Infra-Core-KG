const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const stream = conn.exec('sudo -u postgres psql -d network_monitor_db', (err, ch) => {
        ch.on('data', d => console.log(d.toString()));
        ch.on('close', () => conn.end());
        ch.write(`
        SELECT command, status, count(*), min(created_at), max(created_at)
        FROM agent_commands
        GROUP BY command, status
        ORDER BY count(*) DESC;

        SELECT ac.agent_uuid, ac.command, ac.status, ac.output, ac.created_at, ac.updated_at
        FROM agent_commands ac
        LEFT JOIN assets a ON LOWER(a.uuid) = LOWER(ac.agent_uuid)
        WHERE a.id IS NULL
        LIMIT 10;
        \\q
        `);
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});
