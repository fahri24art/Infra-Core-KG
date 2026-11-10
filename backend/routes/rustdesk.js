const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const { execFileSync } = require('child_process');

// Self-Hosted TCF RustDesk Enterprise Configuration (Server 66)
const RUSTDESK_ID_SERVER = '192.168.1.66';
const RUSTDESK_RELAY_SERVER = '192.168.1.66';
const RUSTDESK_PUBLIC_DOMAIN = 'server.tricentrumfortuna.com';
const RUSTDESK_PUBLIC_KEY = 'goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=';
const DEFAULT_UNATTENDED_PASS = 'Tcf*Remote2026';
const SQLITE_DB_PATH = '/opt/rustdesk/db_v2.sqlite3';

/**
 * Helper: Read registered peers directly from /opt/rustdesk/db_v2.sqlite3 on Server 66
 */
function readRustDeskSqlitePeers() {
    if (!fs.existsSync(SQLITE_DB_PATH)) return [];
    try {
        const pyScript = `
import sqlite3, json
conn = sqlite3.connect('${SQLITE_DB_PATH}')
rows = conn.execute("SELECT id, uuid, info, created_at FROM peer ORDER BY created_at DESC").fetchall()
out = []
for r in rows:
    u = r[1].decode('utf-8', errors='ignore') if isinstance(r[1], bytes) else str(r[1] or '')
    info = {}
    try:
        info = json.loads(r[2]) if r[2] else {}
    except:
        pass
    ip = str(info.get('ip', '')).replace('::ffff:', '')
    out.append({'id': str(r[0]), 'uuid': u, 'ip': ip, 'created_at': str(r[3])})
print(json.dumps(out))
`;
        const stdout = execFileSync('python3', ['-c', pyScript], { encoding: 'utf8', timeout: 4000 });
        return JSON.parse(stdout.trim() || '[]');
    } catch (err) {
        console.error('[RustDesk SQLite] Failed to read db_v2.sqlite3:', err.message);
        return [];
    }
}

/**
 * Helper: Build PowerShell command for the TCF Agent to configure & heal RustDesk on the client PC
 */
function buildRustDeskHealCommand(unattendedPassword = DEFAULT_UNATTENDED_PASS, serverHost = RUSTDESK_ID_SERVER, assetUuid = '') {
    const safePass = String(unattendedPassword || DEFAULT_UNATTENDED_PASS).replace(/['"`$]/g, '');
    return `
$ErrorActionPreference = "SilentlyContinue"
$rdPaths = @(
    "C:\\Program Files\\RustDesk\\rustdesk.exe",
    "C:\\Program Files (x86)\\RustDesk\\rustdesk.exe",
    "$env:ProgramFiles\\RustDesk\\rustdesk.exe"
)
$rdExe = $rdPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

$tomlContent = @"
rendezvous_server = '${serverHost}:21116'
nat_type = 1
serial = 0

[options]
custom-rendezvous-server = '${serverHost}'
relay-server = '${serverHost}'
api-server = 'http://${serverHost}:21114'
key = '${RUSTDESK_PUBLIC_KEY}'
direct-server = 'Y'
allow-remote-config-modification = 'Y'
"@

$configDirs = @(
    "C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config",
    "$env:APPDATA\\RustDesk\\config",
    "$env:LOCALAPPDATA\\RustDesk\\config",
    "$env:ProgramData\\RustDesk\\config"
)
foreach ($dir in $configDirs) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText("$dir\\RustDesk2.toml", $tomlContent, (New-Object System.Text.UTF8Encoding $false))
}

# Open Windows Firewall for RustDesk Direct LAN & Service
New-NetFirewallRule -DisplayName "TCF RustDesk Direct LAN" -Direction Inbound -Protocol TCP -LocalPort 21118,21119 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "TCF RustDesk UDP" -Direction Inbound -Protocol UDP -LocalPort 21118,21119 -Action Allow -ErrorAction SilentlyContinue | Out-Null

# Silent Auto-Update Agent Script to V30
if (Test-Path "C:\\ProgramData\\PowerAssetAgent") {
    Invoke-WebRequest -Uri "http://${serverHost}:5000/downloads/PowerAsset_Agent_SG.ps1" -OutFile "C:\\ProgramData\\PowerAssetAgent\\PowerAsset_Agent.ps1" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
}

if ($rdExe) {
    & $rdExe --password "${safePass}" 2>$null
    $svc = Get-Service -Name "RustDesk*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($svc) {
        Set-Service -Name $svc.Name -StartupType Automatic -ErrorAction SilentlyContinue
        Restart-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
    } else {
        Start-Process -FilePath $rdExe -ArgumentList "--install-service" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    $rdId = (& $rdExe --get-id 2>$null | Out-String).Trim()
    if (-not $rdId -or $rdId -notmatch '^\\d+$') {
        foreach ($dir in $configDirs) {
            if (Test-Path "$dir\\RustDesk.toml") {
                $m = [regex]::Match((Get-Content "$dir\\RustDesk.toml" -Raw), '(?<!enc_)\\bid\\s*=\\s*[\\x27\\x22]?(\\d+)[\\x27\\x22]?')
                if ($m.Success) { $rdId = $m.Groups[1].Value; break }
            }
        }
    }
    $outMsg = "RUSTDESK_HEALED_OK|ID=$rdId|SERVER=${serverHost}|PASS=${safePass}"
} else {
    $outMsg = "RUSTDESK_NOT_INSTALLED"
}
Write-Output $outMsg
if ("${assetUuid}" -ne "") {
    $respBody = @{ status = "executed"; output = $outMsg } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://${serverHost}:5000/api/network/agents/command/response/${assetUuid}" -Method Post -Body $respBody -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
}
`.trim();
}

// POST /api/rustdesk/register - Register RustDesk ID with asset
router.post('/register', async (req, res) => {
    try {
        const { uuid, rustdesk_id, hostname, ip_address, unattended_password } = req.body;
        console.log(`[RustDesk] Registration: ${hostname} - RustDesk ID: ${rustdesk_id}`);

        let asset = null;
        if (uuid) asset = await db('assets').where('uuid', uuid).first();
        if (!asset && hostname) asset = await db('assets').whereRaw('UPPER(name) = ?', [String(hostname).toUpperCase()]).first();
        if (!asset && ip_address) asset = await db('assets').where('ip_address', ip_address).first();

        if (asset) {
            let specs = {};
            try {
                specs = typeof asset.specs === 'object' ? (asset.specs || {}) : JSON.parse(asset.specs || '{}');
            } catch (e) {}
            if (unattended_password) specs.rustdesk_password = unattended_password;
            specs.rustdesk_server = RUSTDESK_ID_SERVER;

            await db('assets').where('id', asset.id).update({
                rustdesk_id: rustdesk_id,
                specs: JSON.stringify(specs),
                agent_status: 'Online',
                last_agent_sync: new Date()
            });
            return res.json({ success: true, message: 'RustDesk ID updated on existing asset', asset_id: asset.id });
        }

        res.json({ success: true, message: 'RustDesk ID received' });
    } catch (err) {
        console.error('[RustDesk] Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// GET /api/rustdesk/connection/:assetId - Get complete RustDesk connection details & auto-heal ID if missing
router.get('/connection/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;

        let asset = null;
        if (!isNaN(Number(assetId))) {
            asset = await db('assets').where('id', Number(assetId)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', assetId).orWhere('name', assetId).first();
        }

        if (!asset) {
            return res.status(404).json({ error: 'Perangkat tidak ditemukan di database.' });
        }

        let specs = {};
        try {
            specs = typeof asset.specs === 'object' ? (asset.specs || {}) : JSON.parse(asset.specs || '{}');
        } catch (e) {}

        let rustdeskId = asset.rustdesk_id ? String(asset.rustdesk_id).trim() : '';

        // If rustdesk_id is missing in DB, check /opt/rustdesk/db_v2.sqlite3 by UUID or IP
        const peers = readRustDeskSqlitePeers();
        let peerOnlineInServer = false;
        let matchedPeer = null;

        if (rustdeskId) {
            matchedPeer = peers.find(p => p.id === rustdeskId);
            if (matchedPeer) peerOnlineInServer = true;
        } else if (peers.length > 0) {
            const assetUuidClean = String(asset.uuid || '').split('-').slice(0, 5).join('-').toLowerCase();
            matchedPeer = peers.find(p =>
                (assetUuidClean && p.uuid && p.uuid.toLowerCase().includes(assetUuidClean)) ||
                (asset.ip_address && asset.ip_address !== '192.168.1.1' && p.ip === asset.ip_address)
            );
            if (matchedPeer) {
                rustdeskId = matchedPeer.id;
                peerOnlineInServer = true;
                await db('assets').where('id', asset.id).update({ rustdesk_id: rustdeskId });
            }
        }

        const unattendedPassword = specs.rustdesk_password || DEFAULT_UNATTENDED_PASS;
        const connectionLink = rustdeskId ? `rustdesk://${rustdeskId}` : null;
        const directIpLink = asset.ip_address ? `rustdesk://${asset.ip_address}` : null;

        // Log session non-fatally
        try {
            await db('remote_sessions').insert({
                asset_id: asset.id,
                user_id: req.user?.id || null,
                session_type: 'rustdesk',
                started_at: new Date(),
                status: 'active'
            });
        } catch (logErr) {}

        res.json({
            success: true,
            asset_id: asset.id,
            asset_name: asset.name,
            ip_address: asset.ip_address || '',
            agent_status: asset.agent_status || 'Offline',
            last_agent_sync: asset.last_agent_sync,
            rustdesk_id: rustdeskId || null,
            connectionLink,
            directIpLink,
            unattended_password: unattendedPassword,
            peer_registered_on_server: peerOnlineInServer,
            server_config: {
                id_server: RUSTDESK_ID_SERVER,
                relay_server: RUSTDESK_RELAY_SERVER,
                public_domain: RUSTDESK_PUBLIC_DOMAIN,
                key: RUSTDESK_PUBLIC_KEY
            }
        });
    } catch (err) {
        console.error('[RustDesk] Connection error:', err);
        res.status(500).json({ error: 'Gagal mengambil informasi koneksi RustDesk' });
    }
});

// POST /api/rustdesk/remote-action/:assetId - Trigger remote self-healing / password reset via TCF Agent
router.post('/remote-action/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;
        const { action = 'heal_rustdesk', password = DEFAULT_UNATTENDED_PASS } = req.body || {};

        let asset = null;
        if (!isNaN(Number(assetId))) {
            asset = await db('assets').where('id', Number(assetId)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', assetId).orWhere('name', assetId).first();
        }
        if (!asset || !asset.uuid) {
            return res.status(404).json({ error: 'Agent UUID belum terdaftar pada perangkat ini.' });
        }

        let specs = {};
        try {
            specs = typeof asset.specs === 'object' ? (asset.specs || {}) : JSON.parse(asset.specs || '{}');
        } catch (e) {}

        const targetPass = String(password || specs.rustdesk_password || DEFAULT_UNATTENDED_PASS).trim();
        specs.rustdesk_password = targetPass;
        specs.rustdesk_server = RUSTDESK_ID_SERVER;
        await db('assets').where('id', asset.id).update({ specs: JSON.stringify(specs) });

        const psCommand = buildRustDeskHealCommand(targetPass, RUSTDESK_ID_SERVER, asset.uuid);

        const [inserted] = await db('agent_commands').insert({
            agent_uuid: asset.uuid,
            command: psCommand,
            status: 'pending'
        }).returning('id');
        const cmdId = typeof inserted === 'object' ? (inserted.id || inserted) : inserted;

        res.json({
            success: true,
            command_id: cmdId,
            unattended_password: targetPass,
            message: `Perintah ${action} berhasil dikirim ke Agent ${asset.name}. Akan dieksekusi dalam <10 detik.`
        });
    } catch (err) {
        console.error('[RustDesk Remote Action] Error:', err);
        res.status(500).json({ error: 'Gagal mengirim perintah RustDesk ke Agent.' });
    }
});

// POST /api/rustdesk/sync-peers - Sync all peers from /opt/rustdesk/db_v2.sqlite3
router.post('/sync-peers', async (req, res) => {
    try {
        const peers = readRustDeskSqlitePeers();
        const assets = await db('assets').whereIn('category', ['Computer', 'Desktop', 'Laptop', 'PC', 'Notebook', 'Server']).select('*');

        let updatedCount = 0;
        for (const asset of assets) {
            if (asset.rustdesk_id) continue;
            const assetUuidBase = String(asset.uuid || '').split('-').slice(0, 5).join('-').toLowerCase();
            const match = peers.find(p =>
                (assetUuidBase && assetUuidBase.length > 10 && p.uuid.toLowerCase().includes(assetUuidBase)) ||
                (asset.ip_address && asset.ip_address !== '192.168.1.1' && p.ip === asset.ip_address)
            );
            if (match) {
                await db('assets').where('id', asset.id).update({ rustdesk_id: match.id });
                updatedCount++;
            }
        }

        res.json({
            success: true,
            total_sqlite_peers: peers.length,
            assets_updated: updatedCount,
            peers: peers.slice(0, 50)
        });
    } catch (err) {
        console.error('[RustDesk Sync Peers] Error:', err);
        res.status(500).json({ error: 'Failed to sync peers' });
    }
});

// GET /api/rustdesk/config - Get RustDesk server configuration for clients & admins
router.get('/config', (req, res) => {
    res.json({
        id_server: RUSTDESK_ID_SERVER,
        relay_server: RUSTDESK_RELAY_SERVER,
        public_domain: RUSTDESK_PUBLIC_DOMAIN,
        key: RUSTDESK_PUBLIC_KEY,
        default_password: DEFAULT_UNATTENDED_PASS
    });
});

module.exports = router;
