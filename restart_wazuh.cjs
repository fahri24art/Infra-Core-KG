const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('[SSH] Connected to 192.168.1.3'); 
    conn.exec('echo "nevergiveup" | sudo -S systemctl restart wazuh-dashboard && echo "nevergiveup" | sudo -S systemctl status wazuh-dashboard', (err, stream) => { 
        stream.on('data', d => process.stdout.write(d)); 
        stream.stderr.on('data', d => process.stderr.write(d)); 
        stream.on('close', () => { 
            conn.end(); 
            process.exit(0); 
        }); 
    }); 
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({ 
    host: '192.168.1.3', 
    port: 22, 
    username: 'tcf', 
    password: 'nevergiveup' 
});
