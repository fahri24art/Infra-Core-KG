const { RouterOSAPI } = require('node-routeros');

const conn = new RouterOSAPI({
    host: '192.168.1.1',
    user: 'tcf',
    password: 'Tr1Centrum_S3cur3!2026',
    port: 8728
});

conn.connect()
    .then(() => {
        return conn.write('/ip/firewall/nat/print');
    })
    .then((results) => {
        const filtered = results.filter(r => r.action === 'dst-nat' && (r['dst-port'] === '80' || r['dst-port'] === '443' || r['dst-port'] === '80,443'));
        console.log("CADDY/WEB NAT RULES:");
        filtered.forEach(r => {
            console.log(`- ID: ${r['.id']}, Disabled: ${r.disabled}, Chain: ${r.chain}, In-Interface: ${r['in-interface'] || r['dst-address'] || 'ANY'}, Dst-Port: ${r['dst-port']}, To-Addresses: ${r['to-addresses']}, To-Ports: ${r['to-ports'] || r['dst-port']}, Comment: ${r.comment}`);
        });
        conn.close();
    })
    .catch((err) => {
        console.error(err);
        conn.close();
    });
