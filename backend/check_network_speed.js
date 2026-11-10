const { RouterOSAPI } = require('node-routeros');

const conn = new RouterOSAPI({
    host: '192.168.1.1',
    user: 'tcf',
    password: 'Tr1Centrum_S3cur3!2026',
    port: 8728
});

conn.connect()
    .then(async () => {
        const interfaces = await conn.write('/interface/print');
        const activeIfaces = interfaces.filter(i => i.running === 'true' || i.running === true).map(i => i.name).join(',');
        
        console.log("Checking traffic for:", activeIfaces);
        const traffic = await conn.write('/interface/monitor-traffic', [`=interface=${activeIfaces}`, '=once=']);
        
        console.log("\n=== Network Traffic ===");
        traffic.forEach(iface => {
            const rxMbps = (iface['rx-bits-per-second'] / 1000000).toFixed(2);
            const txMbps = (iface['tx-bits-per-second'] / 1000000).toFixed(2);
            if (rxMbps > 1 || txMbps > 1) { // Only show active ones > 1 Mbps
                console.log(`Interface: ${iface.name}`);
                console.log(`  Download (RX): ${rxMbps} Mbps`);
                console.log(`  Upload (TX): ${txMbps} Mbps`);
            }
        });
        conn.close();
    })
    .catch((err) => {
        console.error("Error connecting to Mikrotik:", err);
        if (conn && conn.connected) conn.close();
    });
