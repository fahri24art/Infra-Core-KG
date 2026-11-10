const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        const glpiFile = fs.readFileSync('backend/routes/glpi.js');
        
        sftp.writeFile('/opt/power_asset/backend/routes/glpi.js', glpiFile, (err) => {
            if (err) throw err;
            console.log('glpi.js uploaded');
            conn.exec('pm2 restart power-asset', (err, stream) => {
                stream.on('close', () => {
                    console.log('PM2 power-asset backend restarted successfully');
                    conn.end();
                    process.exit(0);
                });
            });
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
