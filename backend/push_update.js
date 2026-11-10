const db = require('./db');

async function deployUpdate() {
    console.log('Fetching active assets with UUID...');
    const assets = await db('assets').whereNotNull('uuid').where('agent_status', 'Online');
    console.log(`Found ${assets.length} online agents.`);
    
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
    for (let asset of assets) {
        await db('agent_commands').insert({
            asset_id: asset.id,
            command: command,
            status: 'pending',
            created_at: new Date()
        });
        count++;
    }
    console.log(`Queued update command for ${count} agents.`);
    process.exit(0);
}

deployUpdate().catch(console.error);
