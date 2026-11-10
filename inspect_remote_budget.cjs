const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
    c.exec("grep -B 2 -A 10 'POST /api/budgeting/department-requests' /root/.pm2/logs/power-asset-out.log | tail -n 40", (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => { c.end(); process.exit(0); });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'Nevergiveup572*' });
