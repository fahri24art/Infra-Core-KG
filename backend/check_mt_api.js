const { RouterOSAPI } = require('node-routeros');

const conn = new RouterOSAPI({
    host: '192.168.1.1',
    user: 'tcf',
    password: 'Tr1Centrum_S3cur3!2026',
    port: 8728
});

async function main() {
    try {
        await conn.connect();
        console.log("Connected to MikroTik API 8728!");
        
        // Check dhcp5 leases
        const leases = await conn.write('/ip/dhcp-server/lease/print');
        const v10Leases = leases.filter(l => l.server === 'dhcp5');
        console.log(`\n=== Total VLAN 10 Leases (dhcp5): ${v10Leases.length} ===`);
        v10Leases.slice(0, 10).forEach(l => {
            console.log(`  IP: ${l.address} | MAC: ${l['mac-address']} | Host: ${l['host-name']} | Status: ${l.status}`);
        });

        // Check traffic on bridge-vlan10
        const traffic = await conn.write('/interface/monitor-traffic', ['=interface=bridge-vlan10,ether1-ISP2-iForte,ether2-Comtronic', '=once=']);
        console.log("\n=== Live Traffic Rates ===");
        traffic.forEach(t => {
            const rxMbps = (Number(t['rx-bits-per-second']) / 1000000).toFixed(2);
            const txMbps = (Number(t['tx-bits-per-second']) / 1000000).toFixed(2);
            console.log(`  ${t.name.padEnd(20)}: Rx ${rxMbps} Mbps | Tx ${txMbps} Mbps`);
        });

        conn.close();
    } catch (e) {
        console.error("API Error:", e);
        if (conn && conn.connected) conn.close();
    }
}

main();
