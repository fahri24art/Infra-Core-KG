const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    // Call seed-templates via curl locally on the server
    const cmd = `curl -s -X POST http://127.0.0.1:5000/api/budgeting/activity-plans/seed-templates -H "Content-Type: application/json" -d '{"year": 2027}' && echo "" && curl -s -X POST http://127.0.0.1:5000/api/budgeting/activity-plans/seed-templates -H "Content-Type: application/json" -d '{"year": 2026}'`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => {
            console.log('\n[SSH] Seed templates done with code:', code);
            conn.end();
            process.exit(0);
        });
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});
