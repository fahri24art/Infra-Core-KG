const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('python3 -c "import openpyxl; print(\'openpyxl is OK\')"', (err, stream) => {
        stream.on('data', d => console.log('STDOUT:', d.toString()));
        stream.on('stderr', d => console.log('STDERR:', d.toString()));
        stream.on('close', code => {
            console.log('Exit code:', code);
            conn.end();
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'Nevergiveup572*' });
