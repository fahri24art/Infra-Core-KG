const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('node -e "require(\'dotenv\').config({path: \'/opt/power_asset/backend/.env\'}); const scraper = require(\'/opt/power_asset/backend/services/ricoh_scraper.js\'); scraper.scrapeAndSyncDevice(\'192.168.2.10\', \'MC-01-PPIC\').then(() => {console.log(\'Done\'); process.exit(0)}).catch(e => {console.log(e); process.exit(1)});" ', (err, stream) => {
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
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'nevergiveup'
});
