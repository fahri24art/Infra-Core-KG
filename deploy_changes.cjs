const SftpClient = require('ssh2-sftp-client');
const { Client } = require('ssh2');
const path = require('path');

const config = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const config2 = {
    ...config,
    password: 'nevergiveup'
};

async function deploy() {
    const sftp = new SftpClient();
    let connected = false;
    
    try {
        console.log('Trying first password...');
        await sftp.connect(config);
        connected = true;
    } catch (e) {
        console.log('First password failed, trying second...');
        try {
            await sftp.connect(config2);
            connected = true;
            config.password = config2.password;
        } catch (e2) {
            console.error('Failed to connect with both passwords', e2);
            return;
        }
    }

    if (connected) {
        console.log('Connected to SFTP!');
        
        try {
            console.log('Uploading portal.js...');
            await sftp.fastPut(path.join(__dirname, 'backend', 'routes', 'portal.js'), '/opt/power_asset/backend/routes/portal.js');
            
            console.log('Uploading tickets.js...');
            await sftp.fastPut(path.join(__dirname, 'backend', 'routes', 'tickets.js'), '/opt/power_asset/backend/routes/tickets.js');
            
            console.log('Uploading uptime_kuma.js...');
            await sftp.fastPut(path.join(__dirname, 'backend', 'routes', 'uptime_kuma.js'), '/opt/power_asset/backend/routes/uptime_kuma.js');

            console.log('Uploading whatsapp_bot.js...');
            await sftp.fastPut(path.join(__dirname, 'backend', 'whatsapp_bot.js'), '/opt/power_asset/backend/whatsapp_bot.js');

            console.log('Uploading package.json...');
            await sftp.fastPut(path.join(__dirname, 'backend', 'package.json'), '/opt/power_asset/backend/package.json');

            
            console.log('Uploading frontend dist directory...');
            await sftp.uploadDir(path.join(__dirname, 'dist'), '/opt/power_asset/dist');
            
            console.log('Upload complete! Restarting backend...');
            
            // Execute restart command
            const conn = new Client();
            conn.on('ready', () => {
                conn.exec('cd /opt/power_asset/backend && npm install && pm2 restart power-asset && pm2 restart whatsapp-bot', (err, stream) => {
                    if (err) throw err;
                    stream.on('close', (code, signal) => {
                        console.log('PM2 restart finished with code ' + code);
                        conn.end();
                        sftp.end();
                    }).on('data', (data) => {
                        console.log('STDOUT: ' + data);
                    }).stderr.on('data', (data) => {
                        console.log('STDERR: ' + data);
                    });
                });
            }).on('error', (err) => {
                console.error('SSH exec error:', err);
            }).connect(config);
            
        } catch (err) {
            console.error('Upload failed:', err);
            sftp.end();
        }
    }
}

deploy();
