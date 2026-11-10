const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- Connected to 192.168.1.3 ---');

    // Command to get the script path specifically
    // PM2 output can be tricky, so we use a regex or a simple grep
    const cmd = "pm2 show infra-guard-api | grep 'script path' | awk -F'│' '{print $3}' | xargs";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => out += d);
        stream.on('stderr', d => out += d);
        stream.on('close', () => {
            console.log('--- Script Path ---');
            console.log(out.trim());
            // Also list files in that directory
            const dir = out.trim().split('/').slice(0, -1).join('/');
            if (dir) {
                conn.exec(`ls -F ${dir}`, (err2, stream2) => {
                    if (err2) throw err2;
                    let out2 = '';
                    stream2.on('data', d => out2 += d);
                    stream2.on('close', () => {
                        console.log('--- Directory Listing ---');
                        console.log(out2);
                        conn.end();
                    });
                });
            } else {
                conn.end();
            }
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '192.168.1.3',
    username: 'tcf',
    password: 'nevergiveup'
});
