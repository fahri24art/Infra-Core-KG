const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const conn = new Client();
conn.on('ready', () => {
    const cmd = `su - postgres -c "psql -d network_monitor_db -c 'ALTER TABLE budget_department_requests ADD COLUMN IF NOT EXISTS dept_head_name VARCHAR(150), ADD COLUMN IF NOT EXISTS signed_attachment TEXT, ADD COLUMN IF NOT EXISTS signed_attachment_name VARCHAR(255);'"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => {
            conn.end();
        });
    });
}).connect(sshConfig);
