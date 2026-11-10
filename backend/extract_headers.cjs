const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    // Use -i to see headers, -X POST
    const cmd = 'curl -i -X POST http://localhost/api/login';
    let output = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => output += d);
        stream.on('close', () => {
            console.log('--- Curl Headers START ---');
            // Print only the headers (up to the first blank line)
            const headers = output.split('\r\n\r\n')[0] || output.split('\n\n')[0];
            console.log(headers);
            console.log('--- Curl Headers END ---');
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '192.168.1.3',
    port: 22,
    username: 'tcf',
    password: 'nevergiveup',
    readyTimeout: 15000
});
