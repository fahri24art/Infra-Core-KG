const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, 'whatsapp_auth');
const tmpAuthDir = '/home/tcf/.whatsapp_auth'; // From your code

function cleanup(dir) {
    if (fs.existsSync(dir)) {
        console.log(`Cleaning up ${dir}...`);
        fs.rmSync(dir, { recursive: true, force: true });
        console.log('Done.');
    } else {
        console.log(`${dir} does not exist.`);
    }
}

cleanup(authDir);
cleanup(tmpAuthDir);

console.log('\nSession cleared. Please restart your backend server now.');
console.log('Command: npm start');
