const http = require('http');
const https = require('https');

console.log('Testing HTTP...');
http.get('http://server.tricentrumfortuna.com:66/api/network/agents/poll', res => {
    console.log('HTTP Status Code:', res.statusCode);
}).on('error', err => {
    console.log('HTTP Error:', err.message);
});

console.log('Testing HTTPS...');
https.get('https://server.tricentrumfortuna.com:66/api/network/agents/poll', { rejectUnauthorized: false }, res => {
    console.log('HTTPS Status Code:', res.statusCode);
}).on('error', err => {
    console.log('HTTPS Error:', err.message);
});
