const path = require('path');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function test() {
    console.log('Testing Baileys connection...');
    const authDir = path.join(__dirname, 'whatsapp_auth');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    const logger = pino({ level: 'info' });
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger,
        browser: ['Ubuntu', 'Chrome', '20.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        console.log('CONNECTION UPDATE:', update);
        if (update.qr) {
            console.log('Got QR:', update.qr.substring(0,20) + '...');
        }
        if (update.connection === 'close') {
            console.log('ERROR:', update.lastDisconnect?.error?.message);
            process.exit(1);
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

test();
