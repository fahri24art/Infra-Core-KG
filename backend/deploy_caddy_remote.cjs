const { Client } = require('ssh2');
const fs = require('fs');

const config = `
:80 {
    # Infra Guard Frontend (Static)
    root * /var/www/html/infra-guard/dist
    file_server

    # Infra Guard Backend API (Local Python/FastAPI)
    handle_path /api/* {
        reverse_proxy localhost:7001
    }

    # Infra Guard Socket Relay
    handle_path /socket.io/* {
        reverse_proxy localhost:3001
    }

    # Power Asset Gateway (Remote Node Backend)
    handle_path /gateway/* {
        reverse_proxy 192.168.1.67:5000
    }

    # Fallback for SPA (Infra Guard)
    handle / {
        try_files {path} /index.html
    }

    log {
        output file /var/log/caddy/access.log
    }
}
`;

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    const remoteTemp = '/tmp/Caddyfile.new';
    const remoteDest = '/etc/caddy/Caddyfile';

    conn.sftp((err, sftp) => {
        if (err) throw err;
        const stream = sftp.createWriteStream(remoteTemp);
        stream.on('close', () => {
            console.log(`--- Uploaded new Caddyfile to ${remoteTemp} ---`);

            // Move and Reload
            const cmd = `echo "nevergiveup" | sudo -S mv ${remoteTemp} ${remoteDest} && echo "nevergiveup" | sudo -S systemctl reload caddy`;
            conn.exec(cmd, (err, execStream) => {
                if (err) throw err;
                execStream.on('close', (code) => {
                    console.log(`--- Caddy Reloaded (Exit Code: ${code}) ---`);
                    conn.end();
                }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
            });
        });
        stream.end(config);
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '192.168.1.3',
    port: 22,
    username: 'tcf',
    password: 'nevergiveup',
    readyTimeout: 30000
});
