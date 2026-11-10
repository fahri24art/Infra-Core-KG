const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- Connected to 192.168.1.3 ---');

    // 1. Direct Backend Test
    const directCmd = 'curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:7001/api/auth/login';
    // 2. Caddy Test (via IP, should be proxied)
    const caddyCmd = 'curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost/api/auth/login';

    conn.exec(directCmd, (err, stream) => {
        if (err) throw err;
        let directOut = '';
        stream.on('data', d => directOut += d);
        stream.on('close', () => {
            console.log('Direct Backend Result:', directOut);

            conn.exec(caddyCmd, (err2, stream2) => {
                if (err2) throw err2;
                let caddyOut = '';
                stream2.on('data', d2 => caddyOut += d2);
                stream2.on('close', () => {
                    console.log('Caddy Proxy Result:', caddyOut);

                    // Now read logs
                    const logCmd = 'tail -n 10 ~/.pm2/logs/infra-guard-api-out.log';
                    conn.exec(logCmd, (err3, stream3) => {
                        if (err3) throw err3;
                        let logOut = '';
                        stream3.on('data', d3 => logOut += d3);
                        stream3.on('close', () => {
                            console.log('--- PM2 Logs for Controlled Test ---');
                            console.log(logOut);
                            conn.end();
                        });
                    });
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '192.168.1.3',
    username: 'tcf',
    password: 'nevergiveup'
});
