const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const cmd = `sshpass -p "nevergiveup" ssh -o StrictHostKeyChecking=no root@192.168.1.3 "find / -name '*wazuh*' -o -name '*opensearch*' -o -name '*pass*' 2>/dev/null | grep -E 'yml|conf|txt|env' | head -n 40"`;
    conn.exec(cmd, (err, stream) => {
        let stdout = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('close', () => {
            console.log('--- WAZUH FILES ON 192.168.1.3 ---');
            console.log(stdout);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
