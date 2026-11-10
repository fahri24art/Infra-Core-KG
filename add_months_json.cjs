const { Client } = require('ssh2');

const alterSql = `
ALTER TABLE budget_activity_plans ADD COLUMN IF NOT EXISTS plan_months JSONB DEFAULT '[]'::jsonb;
ALTER TABLE budget_activity_plans ADD COLUMN IF NOT EXISTS actual_months JSONB DEFAULT '[]'::jsonb;
`;

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const escapedSql = alterSql.replace(/\n/g, ' ').replace(/"/g, '\\"');
    const cmd = `su - postgres -c "psql -d network_monitor_db -c \\"${escapedSql}\\" && psql -d network_monitor_kg -c \\"${escapedSql}\\""`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => {
            console.log('[SSH] Added plan_months & actual_months, code:', code);
            conn.end();
            process.exit(0);
        });
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});
