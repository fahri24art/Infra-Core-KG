const { spawn } = require('child_process');
const path = require('path');

console.log('--- EMERGENCY START SEQUENCE ---');
console.log('Checking environment...');
console.log('Current Directory:', process.cwd());

const node = spawn('node', ['index.js'], {
    cwd: path.join(__dirname),
    env: process.env
});

node.stdout.on('data', (data) => {
    console.log(`[STDOUT] ${data}`);
});

node.stderr.on('data', (data) => {
    console.error(`[STDERR] ${data}`);
});

node.on('close', (code) => {
    console.log(`[PROCESS] Backend exited with code ${code}`);
});

console.log('Backend process spawned. Watch the logs above!');
