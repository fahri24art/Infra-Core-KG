const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    
    // First, STOP the bot to prevent ban loops, then get logs
    conn.exec('pm2 stop power_asset_bot power_asset_hrga ; pm2 logs power_asset_bot --lines 50 --raw --nostream', (err, stream) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('stderr', e => stderr += e.toString());
        stream.on('close', () => {
            console.log('--- PM2 LOGS & STOP STATUS ---');
            console.log(stdout);
            console.log('--- STDERR ---');
            console.log(stderr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
