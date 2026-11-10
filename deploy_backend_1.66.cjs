const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        const botFile = fs.readFileSync('backend/whatsapp_bot.js');
        const indexFile = fs.readFileSync('backend/index.js');
        const cronFile = fs.readFileSync('backend/cron_daily_report.js');
        
        sftp.writeFile('/opt/power_asset/backend/whatsapp_bot.js', botFile, (err) => {
            if (err) throw err;
            console.log('whatsapp_bot.js uploaded');
            sftp.writeFile('/opt/power_asset/backend/index.js', indexFile, (err) => {
                if (err) throw err;
                console.log('index.js uploaded');
                sftp.writeFile('/opt/power_asset/backend/cron_daily_report.js', cronFile, (err) => {
                    if (err) throw err;
                    console.log('cron_daily_report.js uploaded');
                    conn.exec('pm2 restart power-asset power_asset_bot_1 power_asset_bot_2 power_asset_bot_3', (err, stream) => {
                        stream.on('close', () => {
                            console.log('PM2 all bots restarted successfully');
                            conn.end();
                            process.exit(0);
                        });
                    });
                });
            });
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
