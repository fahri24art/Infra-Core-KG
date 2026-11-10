const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.7!');
    conn.exec('hostname ; docker ps -a ; systemctl list-units --type=service | grep -i wazuh ; find / -name "*wazuh-passwords-tool.sh*" 2>/dev/null', (err, stream) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('stderr', e => stderr += e.toString());
        stream.on('close', () => {
            console.log('--- OUTPUT FROM 192.168.1.7 ---');
            console.log(stdout);
            console.log('--- STDERR ---');
            console.log(stderr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.7', port: 22, username: 'root', password: 'nevergiveup' });
