const { Client } = require('pg');

async function run() {
    const client = new Client({
        host: '192.168.1.66',
        user: 'netadmin',
        password: 'secure_net_pass',
        database: 'network_monitor_db',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id FROM assets WHERE uuid IS NOT NULL AND agent_status = 'Online'");
        console.log(`Found ${res.rows.length} online agents.`);
        
        const command = `
$url = "http://192.168.1.66:5000/PowerAsset_Agent_SG.ps1"
$dest = "C:\\ProgramData\\PowerAsset\\PowerAsset_Agent.ps1"
try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Stop-ScheduledTask -TaskName "PowerAsset_Agent"
    Start-ScheduledTask -TaskName "PowerAsset_Agent"
    "Update Successful"
} catch {
    "Update Failed: $($_.Exception.Message)"
}
`;
        let count = 0;
        for (let row of res.rows) {
            await client.query(
                "INSERT INTO agent_commands (asset_id, command, status, created_at) VALUES ($1, $2, 'pending', NOW())",
                [row.id, command]
            );
            count++;
        }
        console.log(`Queued update command for ${count} agents.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
        console.log("Done.");
    }
}

run();
