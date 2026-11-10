const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('find /opt/power_asset -name "PowerAsset_Agent_SG.ps1"', (err, stream) => {
        let output = '';
        stream.on('data', d => output += d.toString());
        stream.on('close', () => {
            console.log('Found files:\n' + output);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
