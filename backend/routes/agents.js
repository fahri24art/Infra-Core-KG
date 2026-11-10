const express = require('express');
const router = express.Router();
const db = require('../db');
const { processHardwareUpgrade, parseRamGb, extractStorageInfo } = require('../services/hardwareDiff');
const { syncAssetEverywhere } = require('../services/asset_sync');

const fs = require('fs');
const path = require('path');

// GET /api/network/agents/download-sg - Redirect to KG installer on Standalone KG Node
router.get('/download-sg', (req, res) => {
    res.redirect('/api/network/agents/download-kg');
});

// GET /api/network/agents/download-kg - Serve TCF_Agent_Setup_KG_V30.exe
router.get('/download-kg', (req, res) => {
    try {
        let exeCandidates = [
            path.join(__dirname, '..', '..', 'TCF_Agent_Setup_KG_V30.exe'),
            '/opt/power_asset/backend/TCF_Agent_Setup_KG_V30.exe',
            '/opt/power_asset/TCF_Agent_Setup_KG_V30.exe',
            '/opt/power_asset/backend/TCF_Agent_Setup_KG_V29.exe',
            path.join(__dirname, '..', '..', 'TCF_Agent_Setup_KG_V29.exe')
        ];
        let exePath = exeCandidates.find(p => fs.existsSync(p));
        
        if (!exePath) {
            return res.status(404).json({ error: 'Installer KG not found on server' });
        }
        res.download(exePath, path.basename(exePath));
    } catch (err) {
        console.error('[Agent Download] Error:', err);
        res.status(500).json({ error: 'Failed to download installer' });
    }
});

// GET /api/network/agents/download-wazuh - Serve Koneksi_WiFi_TCF.bat
router.get('/download-wazuh', (req, res) => {
    try {
        let batPath = path.join(__dirname, '..', '..', '..', 'Koneksi_WiFi_TCF.bat');
        if (process.env.NODE_ENV === 'production' || !fs.existsSync(batPath)) {
            batPath = '/opt/power_asset/backend/Koneksi_WiFi_TCF.bat';
        }
        
        if (!fs.existsSync(batPath)) {
            return res.status(404).json({ error: 'Installer Wazuh not found on server' });
        }
        res.download(batPath, 'Koneksi_WiFi_TCF.bat');
    } catch (err) {
        console.error('[Agent Download] Error:', err);
        res.status(500).json({ error: 'Failed to download installer' });
    }
});

// GET /api/network/agents/download-offline - Serve Offline_Agent.zip
router.get('/download-offline', (req, res) => {
    try {
        let zipPath = path.join(__dirname, '..', '..', 'public', 'Offline_Agent.zip');
        if (process.env.NODE_ENV === 'production' || !fs.existsSync(zipPath)) {
            zipPath = '/opt/power_asset/dist/Offline_Agent.zip';
            if (!fs.existsSync(zipPath)) {
                zipPath = '/opt/power_asset/backend/Offline_Agent.zip';
            }
        }
        
        if (!fs.existsSync(zipPath)) {
            return res.status(404).json({ error: 'Offline Agent package not found on server' });
        }
        res.download(zipPath, 'Offline_Agent.zip');
    } catch (err) {
        console.error('[Agent Download] Error:', err);
        res.status(500).json({ error: 'Failed to download offline agent package' });
    }
});


// GET /api/agents - List assets with active agents (or all for now to simulate)
router.get('/', async (req, res) => {
    try {
        const org = req.organization || req.headers['x-organization'] || req.query.org || req.query.organization || 'TCF-SG';
        const targetDb = req.db || require('../db').getDb(org);
        const agents = await targetDb('assets')
            .leftJoin('users', 'assets.user_id', 'users.id')
            .whereIn('category', ['Computer', 'Desktop', 'Laptop'])
            .select(
                'assets.id', 'assets.uuid', 'assets.name', 'assets.ip_address', 
                'assets.agent_status', 'assets.last_agent_sync', 'assets.specs', 
                'assets.rustdesk_id', 'assets.contact', 'users.name as user_name'
            );
        res.json(agents);
    } catch (err) {
        console.error('Error fetching agents:', err);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// POST /api/agents/register - Register or Update Agent
router.post('/register', async (req, res) => {
    try {
        let { uuid, hostname, ip_address, mac_address, rustdesk_id, os, specs, security, traffic, metrics, username, network_type, network_name, internet_access, o365_account } = req.body;
        
        // Fix for Offline Agent JSON passing ip_address as an array
        if (Array.isArray(ip_address)) {
            ip_address = ip_address.length > 0 ? ip_address[0] : '';
        }

        const ipStr = String(ip_address || '').trim();
        const hostUpper = String(hostname || '').trim().toUpperCase();
        const userUpper = String(username || '').trim().toUpperCase();
        const netUpper = String(network_name || '').trim().toUpperCase();

        // Auto-detect Plant Karawang (KG) vs Sadang (SG)
        const isKG = req.organization === 'TCF-KG' || 
                     req.headers['x-organization'] === 'TCF-KG' || 
                     (req.body && req.body.organization === 'TCF-KG') || 
                     req.query.org === 'TCF-KG' ||
                     ipStr.startsWith('192.168.40.') || 
                     ipStr.startsWith('192.168.50.') || 
                     ipStr.startsWith('192.168.27.') ||
                     netUpper.includes('KG') || 
                     netUpper.includes('TCFKG') ||
                     hostUpper.includes('TCF2');

        const orgContext = isKG ? 'TCF-KG' : (req.organization || 'TCF-SG');
        const activeDb = require('../db').getDb(orgContext);
        
        console.log(`[AGENT] Registration attempt: ${hostname} (${ip_address}) UUID: ${uuid} [Plant: ${orgContext}]`);

        // 0. STRICT MAGANG / BYOD / GUEST BLOCKLIST GUARD
        // Prevent intern (magang) or guest laptops from ever being inserted into the corporate assets database
        const MAGANG_BLOCKLIST = new Set([
            'RIFADWUTM', 'LAPTOP-L57UQ0FU', 'SAKIENA', 'LAPTOP-O1PLIB7E', 'DESKTOP-OIBOMJT',
            'LAPTOP-7FQD187H', 'RAHMAOKTAVIANTI26', 'RIKALATIFAH1502', 'DESKTOP-OH4441E',
            'ALYA', 'FAHESH', 'LAPTOP-J3999EVR', 'LISKA', 'BULAT', 'DESKTOP-MSIMP',
            'DESKTOP-TEBBAOS', 'WZX148X243'
        ]);
        const isMagangKeyword = /MAGANG|PKL|INTERN|TAMU|LAPTOP_GUEST/i.test(`${hostUpper} ${userUpper} ${netUpper}`);

        if (MAGANG_BLOCKLIST.has(hostUpper) || isMagangKeyword) {
            console.log(`[AGENT BLOCKED] Skipping Magang/BYOD device from assets DB: ${hostname} (${ip_address}, net: ${network_name})`);
            return res.status(200).json({ message: 'Skipped: Magang/BYOD device excluded from corporate asset database', excluded: true });
        }

        // 1. Multi-tier asset matching: UUID -> MAC Address -> Hostname (NO IP matching for agents due to DHCP)
        let asset = null;
        if (uuid) {
            asset = await activeDb('assets').where('uuid', uuid).first();
        }

        if (!asset && specs && specs.serial_number) {
            const incomingSerial = String(specs.serial_number).trim();
            const ignoreSerials = ["default string", "to be filled by o.e.m.", "system serial number", "0", "-", "none", "123456789", "system_serial_number"];
            
            if (incomingSerial && !ignoreSerials.includes(incomingSerial.toLowerCase())) {
                const allAssets = await activeDb('assets').whereNotNull('serial_number').select('*');
                for (const a of allAssets) {
                    if (a.serial_number && !ignoreSerials.includes(a.serial_number.toLowerCase())) {
                        if (a.serial_number.includes(incomingSerial) || incomingSerial.includes(a.serial_number)) {
                            asset = a;
                            console.log(`[AGENT] Matched by Serial Number: ${incomingSerial} -> ${a.name}`);
                            break;
                        }
                    }
                }
            }
        }

        if (!asset && mac_address) {
            const incomingMacs = Array.isArray(mac_address) ? mac_address : [mac_address];
            if (incomingMacs.length > 0) {
                const allAssets = await activeDb('assets').select('*');
                for (const a of allAssets) {
                    try {
                        let assetMacs = [];
                        if (a.specs) {
                            const parsed = typeof a.specs === 'object' ? a.specs : JSON.parse(a.specs);
                            if (parsed && parsed.mac_addresses) assetMacs = parsed.mac_addresses;
                        }
                        const hasCommonMac = incomingMacs.some(im => 
                            assetMacs.some(am => am && im && am.toLowerCase().replace(/[:-]/g, '') === im.toLowerCase().replace(/[:-]/g, ''))
                        );
                        if (hasCommonMac) {
                            asset = a;
                            console.log(`[AGENT] Matched by MAC Address: ${incomingMacs.join(',')} -> ${a.name}`);
                            break;
                        }
                    } catch(e){}
                }
            }
        }

        if (!asset && hostname) {
            // 1. Exact match
            asset = await activeDb('assets').where('name', hostname).first();
            
            // 2. Fuzzy match: Remove -XXXX suffix only if it's a default Windows name (DESKTOP-XXXXXXX-YYYY)
            if (!asset && /^DESKTOP-[A-Z0-9]{7}-[0-9A-F]{4}$/i.test(hostname)) {
                const baseName = hostname.replace(/-[0-9A-F]{4}$/i, '');
                asset = await activeDb('assets').where('name', baseName).first();
                if (asset) console.log(`[AGENT] Fuzzy matched incoming ${hostname} -> existing ${baseName}`);
            }

            if (!asset) {
                const possibleSuffixMatch = await activeDb('assets')
                    .where('name', 'like', `${hostname}-%`)
                    .first();
                if (possibleSuffixMatch && /^DESKTOP-[A-Z0-9]{7}-[0-9A-F]{4}$/i.test(possibleSuffixMatch.name)) {
                    asset = possibleSuffixMatch;
                    console.log(`[AGENT] Fuzzy matched incoming ${hostname} -> existing suffixed ${possibleSuffixMatch.name}`);
                }
            }
        }

        const now = new Date();
        const updateData = {
            ip_address,
            agent_status: 'Online',
            last_agent_sync: now,
        };

        if (rustdesk_id && /^[0-9]{6,12}$/.test(String(rustdesk_id).trim())) {
            updateData.rustdesk_id = rustdesk_id;
        }

        if (username) {
            updateData.windows_login = username;
        }

        if (asset && (!asset.name || asset.name.startsWith('Unknown')) && hostname) {
            updateData.name = hostname;
        }
        if (asset && !asset.uuid && uuid) {
            updateData.uuid = uuid;
        }

        // Properly structure the specs if provided (100% safe against null/undefined)
        let currentSpecs = {};
        if (asset && asset.specs) {
            if (typeof asset.specs === 'object' && asset.specs !== null) {
                currentSpecs = asset.specs;
            } else if (typeof asset.specs === 'string') {
                try {
                    const parsed = JSON.parse(asset.specs);
                    if (parsed && typeof parsed === 'object') currentSpecs = parsed;
                } catch(e){}
            }
        }

        const safeSpecs = (specs && typeof specs === 'object' && specs !== null) ? specs : {};
        const newSpecs = {
            ...currentSpecs,
            ...safeSpecs,
            last_update_source: 'PowerAsset Agent'
        };

        // Preserve software if the agent failed to send it but we already have it
        if (!safeSpecs.software && currentSpecs && currentSpecs.software) {
            newSpecs.software = currentSpecs.software;
        }

        if (mac_address) {
            newSpecs.mac_addresses = Array.isArray(mac_address) ? mac_address : [mac_address];
        }
        if (req.body.agent_version || (specs && specs.agent_version)) {
            newSpecs.agent_version = req.body.agent_version || specs.agent_version;
        }
        
        updateData.specs = JSON.stringify(newSpecs);

        // Add Security Data if present
        if (security) {
            updateData.antivirus_name = security.av_name;
            updateData.antivirus_status = security.av_status;
            updateData.threats_found = security.threats_count || 0;
            updateData.last_scan_at = security.last_scan ? new Date(security.last_scan) : now;
        }

        // Map Manufacturer and Model to columns if provided in specs
        if (safeSpecs) {
            if (safeSpecs.manufacturer) updateData.manufacturer = safeSpecs.manufacturer;
            if (safeSpecs.model) updateData.model = safeSpecs.model;
            if (safeSpecs.serial_number) updateData.serial_number = safeSpecs.serial_number;
            if (safeSpecs.peripherals) updateData.peripherals = JSON.stringify(safeSpecs.peripherals);
        }

        // Add Live Metrics Data if present
        if (metrics) {
            updateData.cpu_usage = metrics.cpu_usage || 0;
            updateData.ram_usage = metrics.ram_usage || 0;
            updateData.disk_usage = metrics.disk_usage || 0;
        }

        if (o365_account !== undefined) updateData.o365_account = o365_account;
        if (network_type !== undefined) updateData.network_type = network_type;
        if (network_name !== undefined) updateData.network_name = network_name;
        if (internet_access !== undefined) updateData.internet_access = internet_access;

        if (asset) {
            // Process hardware drift & upgrade detection before updating specs
            if (specs) {
                try {
                    await processHardwareUpgrade({
                        db: activeDb,
                        asset,
                        incomingSpecs: specs,
                        currentSpecs,
                        rawBody: req.body
                    });
                } catch (diffErr) {
                    console.error('[AGENT] Error processing hardware diff:', diffErr);
                }
            }

            await activeDb('assets').where('id', asset.id).update(updateData);
            console.log(`[AGENT] Updated existing asset: ${asset.id} in DB [${orgContext}]`);

            const updatedAsset = await activeDb('assets').where('id', asset.id).first();
            if (updatedAsset) {
                await syncAssetEverywhere(updatedAsset, activeDb);
            }
        } else {
            // New Asset Discovered
            console.log(`[AGENT] Creating new asset in [${orgContext}] with data:`, updateData);

            let org = isKG ? 'TCFKG' : 'TCFSG';
            let cat = 'PC';
            const nameUpper = hostUpper;
            
            // Check hostname
            if (nameUpper.includes('LAPTOP') || nameUpper.includes('NOTEBOOK')) {
                cat = 'NB';
            } 
            // Check network type
            else if (network_type && (network_type.toUpperCase().includes('WIFI') || network_type.toUpperCase().includes('WIRELESS'))) {
                cat = 'NB';
            }
            // Check chassis type from specs if available
            else if (specs && specs.chassis_type && (specs.chassis_type.toLowerCase().includes('notebook') || specs.chassis_type.toLowerCase().includes('laptop'))) {
                cat = 'NB';
            }

            let year = new Date().getFullYear();
            const prefix = `${org}-ICT-${cat}-${year}-`;
            
            const prefixPC = `${org}-ICT-PC-${year}-`;
            const prefixNB = `${org}-ICT-NB-${year}-`;
            
            const latestPC = await activeDb('assets').where('inventory_number', 'like', `${prefixPC}%`).orderBy('inventory_number', 'desc').first();
            const latestNB = await activeDb('assets').where('inventory_number', 'like', `${prefixNB}%`).orderBy('inventory_number', 'desc').first();
            
            let maxNum = 0;
            
            if (latestPC && latestPC.inventory_number) {
                const parts = latestPC.inventory_number.split('-');
                const lastPart = parts[parts.length - 1];
                if (!isNaN(lastPart)) {
                    const num = parseInt(lastPart);
                    if (num > maxNum) maxNum = num;
                }
            }
            if (latestNB && latestNB.inventory_number) {
                const parts = latestNB.inventory_number.split('-');
                const lastPart = parts[parts.length - 1];
                if (!isNaN(lastPart)) {
                    const num = parseInt(lastPart);
                    if (num > maxNum) maxNum = num;
                }
            }
            
            const nextNum = maxNum + 1;
            const newId = prefix + nextNum.toString().padStart(3, '0');
            const resolvedDeviceType = cat === 'NB' ? 'Laptop' : 'Desktop';

            const [inserted] = await activeDb('assets').insert({
                name: hostname || 'Unknown Device',
                uuid: uuid || null,
                ...updateData,
                category: resolvedDeviceType,
                type: resolvedDeviceType,
                status: 'Active',
                inventory_number: newId
            }).returning('id');
            const finalAssetId = typeof inserted === 'object' ? (inserted.id || inserted) : inserted;
            console.log(`[AGENT] New asset inserted successfully with ID: ${newId} into [${orgContext}]`);

            // Trigger centralized cross-module sync
            const newAssetObj = await activeDb('assets').where('id', finalAssetId).first();
            if (newAssetObj) {
                await syncAssetEverywhere(newAssetObj, activeDb);
            }

            // Log Initial Registration into asset_history
            try {
                const initialStorage = extractStorageInfo(specs);
                const initialRam = parseRamGb(specs?.ram);
                const desc = `Perangkat pertama kali terdeteksi dan tersinkronisasi via TCF Agent (${orgContext}).\nSpesifikasi awal: RAM ${initialRam ? initialRam + ' GB' : '-'}, Storage ${initialStorage.totalGb ? initialStorage.totalGb + ' GB' : '-'}, CPU: ${specs?.cpu || '-'}`;
                await activeDb('asset_history').insert({
                    asset_id: finalAssetId,
                    action: 'Initial Registration',
                    details: desc,
                    performed_by: 'TCF Agent Sync',
                    created_at: now
                });
            } catch (histErr) {
                console.error('[AGENT] Failed to log initial registration:', histErr);
            }
        }

        // Process User Traffic Telemetry
        if (traffic && Array.isArray(traffic) && traffic.length > 0) {
            const today = now.toISOString().split('T')[0];
            for (const log of traffic) {
                const existing = await activeDb('user_traffic_logs')
                    .where({ asset_uuid: uuid, url: log.url, log_date: today })
                    .first();

                if (existing) {
                    await activeDb('user_traffic_logs')
                        .where('id', existing.id)
                        .update({
                            hits: existing.hits + (log.hits || 1),
                            data_usage: existing.data_usage + (log.data || 0)
                        });
                } else {
                    await activeDb('user_traffic_logs').insert({
                        asset_uuid: uuid,
                        url: log.url,
                        hits: log.hits || 1,
                        data_usage: log.data || 0,
                        log_date: today
                    });
                }
            }
        }

        res.json({ message: 'Registered successfully' });

    } catch (err) {
        console.error('Registration failed:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// GET /api/agents/poll/:uuid - Poll for pending commands
router.get('/poll/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const org = req.organization || req.headers['x-organization'] || 'TCF-SG';
        let activeDb = require('../db').getDb(org);
        
        let commands = await activeDb('agent_commands')
            .where({ agent_uuid: uuid, status: 'pending' });

        // Update last_agent_sync to keep agent Online
        let updatedCount = await activeDb('assets').where('uuid', uuid).update({
            agent_status: 'Online',
            last_agent_sync: new Date()
        });

        // Failover: if 0 rows updated in current DB, check the alternate DB (KG <-> SG)
        if (updatedCount === 0) {
            const altOrg = org === 'TCF-KG' ? 'TCF-SG' : 'TCF-KG';
            const altDb = require('../db').getDb(altOrg);
            const altUpdated = await altDb('assets').where('uuid', uuid).update({
                agent_status: 'Online',
                last_agent_sync: new Date()
            });
            if (altUpdated > 0) {
                const altCommands = await altDb('agent_commands').where({ agent_uuid: uuid, status: 'pending' });
                if (altCommands && altCommands.length > 0) {
                    commands = altCommands;
                }
            }
        }

        res.json({ commands });

    } catch (err) {
        console.error('Polling failed:', err);
        res.status(500).json({ error: 'Polling failed' });
    }
});

// POST /api/agents/command/response/:uuid - Handle PowerShell Agent Send-Response callback
router.post('/command/response/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const { command_id, output, status } = req.body || {};

        if (command_id) {
            await db('agent_commands').where({ id: command_id }).update({
                output: output || '',
                status: 'executed',
                updated_at: new Date()
            });
        }

        if (output && typeof output === 'string' && output.includes('RUSTDESK_HEALED_OK')) {
            const match = output.match(/ID=([0-9]{6,12})/);
            if (match && match[1]) {
                await db('assets').where('uuid', uuid).update({
                    rustdesk_id: match[1],
                    last_agent_sync: new Date()
                });
                console.log(`[AGENT] Auto-updated RustDesk ID for ${uuid} -> ${match[1]}`);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Agent command response failed:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/agents/response/:id - Handle command output
router.post('/response/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { output } = req.body;

        const cmdRow = await db('agent_commands').where({ id }).first();
        if (cmdRow && output && typeof output === 'string' && output.includes('RUSTDESK_HEALED_OK')) {
            const match = output.match(/ID=([0-9]{6,12})/);
            if (match && match[1]) {
                await db('assets').where('uuid', cmdRow.agent_uuid).update({ rustdesk_id: match[1], last_agent_sync: new Date() });
            }
        }
        await db('agent_commands').where({ id }).update({
            output,
            status: 'executed',
            updated_at: new Date()
        });

        res.json({ success: true });

    } catch (err) {
        console.error('Response processing failed:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/agents/:id/sync - Simulate syncing specs
router.post('/:id/sync', async (req, res) => {
    try {
        const { id } = req.params;

        // SIMULATION: Generate random IP and update status
        const fakeIP = `192.168.1.${Math.floor(Math.random() * 255)}`;
        const now = new Date();

        // Update DB
        await db('assets').where({ id }).update({
            agent_status: 'Online',
            ip_address: fakeIP,
            last_agent_sync: now
        });

        const updated = await db('assets').where({ id }).first();
        res.json({ message: 'Sync successful', agent: updated });

    } catch (err) {
        console.error('Error syncing agent:', err);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// POST /api/agents/:id/command - Send Command (Called from UI)
router.post('/:id/command', async (req, res) => {
    try {
        const { id } = req.params;
        const { command } = req.body;

        let asset = null;
        if (!isNaN(Number(id))) {
            asset = await db('assets').where('id', Number(id)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', id).orWhere('name', id).first();
        }
        if (!asset || !asset.uuid) {
            return res.status(404).json({ error: 'Agent not registered for this asset' });
        }

        // Insert Command with returning id for Postgres compatibility
        const [inserted] = await db('agent_commands').insert({
            agent_uuid: asset.uuid,
            command,
            status: 'pending'
        }).returning('id');
        const cmdId = typeof inserted === 'object' ? (inserted.id || inserted) : inserted;

        let attempts = 0;
        const checkResult = async () => {
            const cmd = await db('agent_commands').where('id', cmdId).first();
            if (cmd && cmd.status === 'executed') {
                return res.json({ output: cmd.output, success: true });
            }
            if (attempts++ > 10) {
                return res.json({ output: 'Command queued. Agent will execute shortly...', success: true, pending: true });
            }
            setTimeout(checkResult, 500);
        };
        checkResult();

    } catch (err) {
        console.error('Error queuing command:', err);
        res.status(500).json({ error: 'Command failed' });
    }
});

// POST /api/agents/:id/action - Execute Quick Remediation Actions
router.post('/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body || {};

        let asset = null;
        if (!isNaN(Number(id))) {
            asset = await db('assets').where('id', Number(id)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', id).orWhere('name', id).first();
        }
        if (!asset || !asset.uuid) {
            return res.status(404).json({ error: 'Agent UUID belum terdaftar pada perangkat ini.' });
        }

        let psCommand = '';
        let actionDesc = '';

        if (action === 'quick_scan') {
            actionDesc = 'Windows Defender Quick Scan';
            psCommand = String.raw`$ErrorActionPreference = "SilentlyContinue"
Start-MpScan -ScanType QuickScan
$threats = (Get-MpThreatDetection -ErrorAction SilentlyContinue | Measure-Object).Count
$outMsg = "DEFENDER_SCAN_COMPLETED|THREATS=$threats"
Write-Output $outMsg
$resp = @{ status = "executed"; output = $outMsg } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://192.168.1.66:5000/api/network/agents/command/response/` + asset.uuid + String.raw`" -Method Post -Body $resp -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null`;
        } else if (action === 'restart_rustdesk') {
            actionDesc = 'Restart Servis RustDesk';
            psCommand = String.raw`$ErrorActionPreference = "SilentlyContinue"
$svc = Get-Service -Name "RustDesk*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc) {
    Restart-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
    $status = (Get-Service -Name $svc.Name -ErrorAction SilentlyContinue).Status
    $outMsg = "RUSTDESK_RESTARTED|STATUS=$status"
} else {
    $outMsg = "RUSTDESK_SERVICE_NOT_FOUND"
}
Write-Output $outMsg
$resp = @{ status = "executed"; output = $outMsg } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://192.168.1.66:5000/api/network/agents/command/response/` + asset.uuid + String.raw`" -Method Post -Body $resp -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null`;
        } else if (action === 'usb_unlock_temp') {
            actionDesc = 'Buka Kunci USB Sementara (1 Jam)';
            psCommand = String.raw`$ErrorActionPreference = "SilentlyContinue"
$polPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices"
if (Test-Path $polPath) {
    Remove-ItemProperty -Path $polPath -Name "Deny_All" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $polPath -Name "Deny_Read" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $polPath -Name "Deny_Write" -ErrorAction SilentlyContinue
}
$guidPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices\{53f5630d-b6bf-11d0-94f2-00a0c91efb8b}"
if (Test-Path $guidPath) {
    Remove-ItemProperty -Path $guidPath -Name "Deny_Read" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $guidPath -Name "Deny_Write" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $guidPath -Name "Deny_Execute" -ErrorAction SilentlyContinue
}
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -Value 3 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\UASPStor" -Name "Start" -Value 3 -Type DWord -Force -ErrorAction SilentlyContinue
$enabledDisks = 0
Get-PnpDevice -Class "DiskDrive" -ErrorAction SilentlyContinue | Where-Object { 
    $_.InstanceId -like "*USBSTOR*" -or $_.InstanceId -like "*UASPSTOR*" -or $_.FriendlyName -match "USB" 
} | ForEach-Object {
    Enable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue
    $enabledDisks++
}
$outMsg = "USB_UNLOCKED_1HOUR_OK|EnabledDisks=$enabledDisks"
Write-Output $outMsg
$resp = @{ status = "executed"; output = $outMsg } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://192.168.1.66:5000/api/network/agents/command/response/` + asset.uuid + String.raw`" -Method Post -Body $resp -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
Start-Sleep -Seconds 3600
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_All" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue`;
        } else if (action === 'usb_lock_now') {
            actionDesc = 'Kunci Port USB Sekarang';
            psCommand = String.raw`$ErrorActionPreference = "SilentlyContinue"
$polPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices"
if (-not (Test-Path $polPath)) { New-Item -Path $polPath -Force | Out-Null }
Set-ItemProperty -Path $polPath -Name "Deny_All" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path $polPath -Name "Deny_Read" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path $polPath -Name "Deny_Write" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
$guidPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices\{53f5630d-b6bf-11d0-94f2-00a0c91efb8b}"
if (-not (Test-Path $guidPath)) { New-Item -Path $guidPath -Force | Out-Null }
Set-ItemProperty -Path $guidPath -Name "Deny_Read" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path $guidPath -Name "Deny_Write" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path $guidPath -Name "Deny_Execute" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\UASPStor" -Name "Start" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue
$disabledDisks = 0
Get-PnpDevice -Class "DiskDrive" -ErrorAction SilentlyContinue | Where-Object { 
    $_.InstanceId -like "*USBSTOR*" -or $_.InstanceId -like "*UASPSTOR*" -or $_.FriendlyName -match "USB" 
} | ForEach-Object {
    Disable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue
    $disabledDisks++
}
$outMsg = "USB_LOCKED_SUCCESS|DenyAll=1|USBSTOR=4|DisabledDisks=$disabledDisks"
Write-Output $outMsg
$resp = @{ status = "executed"; output = $outMsg } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://192.168.1.66:5000/api/network/agents/command/response/` + asset.uuid + String.raw`" -Method Post -Body $resp -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null`;
        } else if (action === 'resync') {
            actionDesc = 'Re-Sync Telemetri Endpoint';
            psCommand = String.raw`$ErrorActionPreference = "SilentlyContinue"
Clear-DnsClientCache -ErrorAction SilentlyContinue
$agentPaths = @("C:\ProgramData\PowerAsset\PowerAsset_Agent.ps1", "C:\ProgramData\PowerAssetAgent\PowerAsset_Agent.ps1")
foreach ($ap in $agentPaths) {
    if (Test-Path $ap) {
        & powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File $ap
        break
    }
}
$outMsg = "TELEMETRY_TRIGGERED"
Write-Output $outMsg
$resp = @{ status = "executed"; output = $outMsg } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://192.168.1.66:5000/api/network/agents/command/response/` + asset.uuid + String.raw`" -Method Post -Body $resp -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null`;
        } else {
            return res.status(400).json({ error: `Aksi tidak dikenal: ${action}` });
        }

        const [inserted] = await db('agent_commands').insert({
            agent_uuid: asset.uuid,
            command: psCommand,
            status: 'pending'
        }).returning('id');
        const cmdId = typeof inserted === 'object' ? (inserted.id || inserted) : inserted;

        console.log(`[AGENT ACTION] Queued ${actionDesc} (CMD ID: ${cmdId}) for ${asset.name} (${asset.uuid})`);

        res.json({
            success: true,
            command_id: cmdId,
            message: `Perintah "${actionDesc}" telah dikirim ke Agent ${asset.name}. Akan dieksekusi dalam <10 detik.`
        });
    } catch (err) {
        console.error('[Agent Action] Error:', err);
        res.status(500).json({ error: 'Gagal memproses aksi remediation agent.' });
    }
});

// GET /api/agents/:id/command-status/:cmdId - Check Command Execution Status
router.get('/:id/command-status/:cmdId', async (req, res) => {
    try {
        const { cmdId } = req.params;
        const cmd = await db('agent_commands').where('id', cmdId).first();
        if (!cmd) {
            return res.status(404).json({ error: 'Perintah tidak ditemukan' });
        }
        res.json({
            id: cmd.id,
            status: cmd.status,
            output: cmd.output,
            updated_at: cmd.updated_at
        });
    } catch (err) {
        res.status(500).json({ error: 'Gagal memeriksa status perintah' });
    }
});

// GET /api/network/agents/:id/history - Get hardware & lifecycle history for asset
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        
        let assetId = parseInt(id, 10);
        if (isNaN(assetId)) {
            const matched = await db('assets').where('uuid', id).orWhere('name', id).first();
            if (matched) assetId = matched.id;
            else return res.json([]);
        }

        const history = await db('asset_history')
            .where('asset_id', assetId)
            .orderBy('created_at', 'desc');

        const formatted = history.map(h => ({
            id: h.id,
            asset_id: h.asset_id,
            action: h.action,
            details: h.details,
            diff_data: h.diff_data,
            performed_by: h.performed_by,
            created_at: h.created_at,
            timestamp: h.created_at,
            date: h.created_at,
            type: h.action,
            description: h.details,
            user: h.performed_by
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching asset history from agents route:', err);
        res.status(500).json({ error: 'Failed to fetch asset history' });
    }
});

// POST /api/agents/network-data - Receive network usage data from agent
router.post('/network-data', async (req, res) => {
    try {
        const { uuid, date, rx_bytes, tx_bytes, total_bytes } = req.body;
        console.log(`[AGENT] Network data from ${uuid}: ${total_bytes} bytes`);
        
        // Store in database or log for now
        res.json({ success: true });
    } catch (err) {
        console.error('[Agent] Network data error:', err);
        res.status(500).json({ error: 'Failed to store network data' });
    }
});

module.exports = router;

