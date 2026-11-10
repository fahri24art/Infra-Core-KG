const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const conn = new Client();
conn.on('ready', () => {
    const cmd = `node -e 'const fs = require("fs"); const d = JSON.parse(fs.readFileSync("/opt/power_asset/backend/data/budget_store.json")); console.log(JSON.stringify(d.department_requests || [], null, 2));'`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => conn.end());
    });
}).connect(sshConfig);
