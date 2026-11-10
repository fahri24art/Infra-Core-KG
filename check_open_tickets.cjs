const { Client: SSHClient } = require('ssh2');

const ssh = new SSHClient();

ssh.on('ready', () => {
    ssh.exec(`cd /opt/power_asset/backend && node -r dotenv/config -e "
        const db = require('./db').getDb('TCF-SG');
        db('tickets').whereNot('status', 'Closed').select('id', 'number', 'subject', 'status', 'source', 'created_at')
            .then(rows => {
                console.log(JSON.stringify(rows, null, 2));
                process.exit(0);
            })
            .catch(e => { console.error(e); process.exit(1); });
    "`, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
            console.log(out);
            ssh.end();
        }).on('data', d => out += d).stderr.on('data', d => console.error(d.toString()));
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});
