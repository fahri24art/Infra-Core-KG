const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const cmd = `sshpass -p "nevergiveup" ssh -o StrictHostKeyChecking=no root@192.168.1.3 "grep -rn 'admin' /etc/wazuh-indexer/ /etc/wazuh-dashboard/ /etc/filebeat/ /var/ossec/ /etc/wazuh/ 2>/dev/null | head -n 30 ; docker ps ; docker exec \$(docker ps -q | head -n 1) cat /etc/wazuh-dashboard/wazuh.yml 2>/dev/null"`;
    conn.exec(cmd, (err, stream) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('stderr', e => stderr += e.toString());
        stream.on('close', () => {
            console.log('--- WAZUH CONFIG SEARCH ON 192.168.1.3 ---');
            console.log(stdout);
            console.log('--- STDERR ---');
            console.log(stderr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
