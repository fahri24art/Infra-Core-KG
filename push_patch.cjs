const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const fs = require('fs');

async function push() {
    const sftp = new Client();
    try {
        await sftp.connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'Nevergiveup572*' });
        
        console.log('Putting generate_budget_excel.py...');
        const scriptBuf = fs.readFileSync('f:/TCF Project Infra/_Scripts/generate_budget_excel.py');
        await sftp.put(scriptBuf, '/opt/power_asset/_Scripts/generate_budget_excel.py');

        console.log('Putting budgeting.js...');
        const routeBuf = fs.readFileSync('f:/TCF Project Infra/APP_Power_Asset/backend/routes/budgeting.js');
        await sftp.put(routeBuf, '/opt/power_asset/backend/routes/budgeting.js');

        await sftp.end();
        console.log('SFTP done!');

        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                stream.on('data', d => console.log(d.toString()));
                stream.on('close', () => {
                    console.log('PM2 restarted!');
                    conn.end();
                    process.exit(0);
                });
            });
        }).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'Nevergiveup572*' });
    } catch(e) {
        console.error('Push error:', e);
        process.exit(1);
    }
}
push();
