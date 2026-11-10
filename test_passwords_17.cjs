const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const passwords = ['nevergiveup', '123456', 'password', 'root', 'admin', 'Tcf@2024', 'Tcf@2025', 'Tcf@2026'];
    let cmd = '';
    for (const p of passwords) {
        cmd += `sshpass -p "${p}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=2 root@192.168.1.17 "echo AUTH_SUCCESS_${p} && docker ps" 2>/dev/null ; `;
    }
    conn.exec(cmd, (err, stream) => {
        let stdout = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('close', () => {
            console.log('--- PASSWORD TEST RESULT ---');
            console.log(stdout);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
