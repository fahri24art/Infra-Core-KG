const { Client } = require('pg');

const client = new Client({
    user: 'netadmin',
    host: '127.0.0.1',
    database: 'network_monitor_db',
    password: 'secure_net_pass',
    port: 5432,
});

client.connect();

client.query("SELECT name, specs FROM assets WHERE agent_status IS NOT NULL", (err, res) => {
    if (err) {
        console.error(err);
        client.end();
        return;
    }

    const withoutV25 = [];

    for (const row of res.rows) {
        if (!row.specs) continue;
        let specs;
        try {
            specs = typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs;
        } catch (e) { continue; }

        let hasAgent = false;
        let isV25 = false;

        const softwares = specs.software || [];
        for (const sw of softwares) {
            const swName = sw.name || '';
            const swVer = sw.version || '';
            if (swName.includes('Power Asset Agent') || swName.includes('PowerAsset Agent')) {
                hasAgent = true;
                if (swVer.includes('25') || swName.includes('25')) {
                    isV25 = true;
                }
            }
        }

        if (specs.last_update_source === 'PowerAsset Agent' || hasAgent) {
            if (!isV25) {
                withoutV25.push(row.name);
            }
        }
    }

    console.log("--- DEVICES WITHOUT V25 ---");
    withoutV25.forEach(d => console.log(d));
    client.end();
});
