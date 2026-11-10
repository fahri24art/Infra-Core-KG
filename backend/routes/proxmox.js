const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');
const db = require('../db');

// Gunakan agent custom agar tidak masalah dengan sertifikat SSL self-signed Proxmox
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Daftar host Proxmox dan credentials
const PROXMOX_HOSTS_FALLBACK = [
    { url: 'https://192.168.1.4:8006', username: 'root@pam', password: 'Nevergiveup-2021' },
    { url: 'https://192.168.1.5:8006', username: 'root@pam', password: 'Nevergiveup-2021' }
];

router.post('/sync', async (req, res) => {
    let newCount = 0;
    let updateCount = 0;
    let errorLog = [];

    // Fetch dynamic hosts from DB
    let PROXMOX_HOSTS = [];
    try {
        const _db = db.getDb(req.query.organization);
        const settings = await _db('settings').where({ section: 'virtualization' });
        const pSettings = settings.reduce((acc, curr) => {
            try {
                acc[curr.key] = JSON.parse(curr.value);
            } catch (e) {
                acc[curr.key] = curr.value;
            }
            return acc;
        }, {});

        if (pSettings.proxmox_url_1 && pSettings.proxmox_user_1) {
            PROXMOX_HOSTS.push({
                url: pSettings.proxmox_url_1,
                username: pSettings.proxmox_user_1,
                password: pSettings.proxmox_pass_1 || ''
            });
        }
        if (pSettings.proxmox_url_2 && pSettings.proxmox_user_2) {
            PROXMOX_HOSTS.push({
                url: pSettings.proxmox_url_2,
                username: pSettings.proxmox_user_2,
                password: pSettings.proxmox_pass_2 || ''
            });
        }
        
        if (PROXMOX_HOSTS.length === 0) {
            console.log('[PROXMOX] No custom hosts configured, using fallback.');
            PROXMOX_HOSTS = PROXMOX_HOSTS_FALLBACK;
        }
    } catch (e) {
        console.error('[PROXMOX] Failed to fetch settings, using fallback.', e);
        PROXMOX_HOSTS = PROXMOX_HOSTS_FALLBACK;
    }

    for (const hostConfig of PROXMOX_HOSTS) {
        try {
            console.log(`[PROXMOX] Authenticating to ${hostConfig.url}...`);
            const authRes = await axios.post(`${hostConfig.url}/api2/json/access/ticket`, {
                username: hostConfig.username,
                password: hostConfig.password
            }, { httpsAgent });

            const ticket = authRes.data.data.ticket;
            const csrfToken = authRes.data.data.CSRFPreventionToken;
            const headers = {
                'Cookie': `PVEAuthCookie=${ticket}`,
                'CSRFPreventionToken': csrfToken
            };

            // Get nodes
            const nodesRes = await axios.get(`${hostConfig.url}/api2/json/nodes`, { headers, httpsAgent });
            const nodes = nodesRes.data.data;

            for (const node of nodes) {
                // User requested to ONLY record the physical server nodes, not the VMs inside them.
                const specs = {
                    source: 'Proxmox Sync',
                    cpu: `${node.maxcpu || 'Unknown'} Cores`,
                    ram: node.maxmem ? `${Math.round(node.maxmem / 1024 / 1024 / 1024)} GB` : 'Unknown',
                    proxmox_node: node.node,
                    proxmox_host: hostConfig.url
                };

                let assetNumber = `PVE-${node.node}`;
                if (hostConfig.url.includes('192.168.1.4')) {
                    assetNumber = 'TCFSG-ICT-SV-2021-005';
                } else if (hostConfig.url.includes('192.168.1.5')) {
                    assetNumber = 'TCFSG-ICT-SV-2022-005';
                }

                const assetData = {
                    name: `Proxmox Host: ${node.node}`,
                    category: 'Server',
                    type: 'Server',
                    manufacturer: 'Proxmox VE',
                    model: 'Physical Server (Hypervisor)',
                    location: 'Server Room',
                    status: node.status === 'online' ? 'Active' : 'Offline',
                    agent_status: node.status === 'online' ? 'Online' : 'Offline',
                    inventory_number: assetNumber,
                    contact: 'IT Infrastructure',
                    specs: JSON.stringify(specs),
                    ip_address: hostConfig.url.replace('https://', '').replace(':8006', ''),
                    updated_at: new Date()
                };

                // Upsert ke database
                const existingAsset = await db('assets').where('inventory_number', assetData.inventory_number).first();

                if (existingAsset) {
                    await db('assets').where('id', existingAsset.id).update(assetData);
                    updateCount++;
                } else {
                    const existingByName = await db('assets').where('name', assetData.name).where('category', 'Server').first();
                    if(existingByName) {
                        await db('assets').where('id', existingByName.id).update(assetData);
                        updateCount++;
                    } else {
                        await db('assets').insert({
                            ...assetData,
                            created_at: new Date()
                        });
                        newCount++;
                    }
                }
            }
        } catch (err) {
            console.error(`[PROXMOX] Failed to sync host ${hostConfig.url}:`, err.message);
            errorLog.push(`Host ${hostConfig.url} failed: ${err.message}`);
        }
    }

    if (errorLog.length > 0 && newCount === 0 && updateCount === 0) {
        return res.status(500).json({ error: 'Sync failed completely.', details: errorLog });
    }

    res.json({
        success: true,
        message: `Sinkronisasi Proxmox selesai. Ditambahkan: ${newCount}, Diperbarui: ${updateCount}`,
        stats: { new: newCount, updated: updateCount },
        errors: errorLog
    });
});

module.exports = router;
