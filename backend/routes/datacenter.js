const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');
const db = require('../db');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const getVirtualizationSettings = async () => {
    try {
        const raw = await db('settings').where({ section: 'virtualization' });
        const config = {};
        raw.forEach(r => {
            try { config[r.key] = JSON.parse(r.value); } catch(e) { config[r.key] = r.value; }
        });
        return config;
    } catch (err) {
        console.error('Failed to load virtualization settings from DB', err);
        return {};
    }
};

router.get('/status', async (req, res) => {
    try {
        const config = await getVirtualizationSettings();
        
        const PROXMOX_NODES = [];
        if (config.proxmox_url_1) {
            // Strip https:// from url to just get IP/hostname if user added it
            let ip1 = config.proxmox_url_1.replace('https://', '').replace(':8006', '');
            PROXMOX_NODES.push({ name: 'Proxmox Host 1', ip: ip1, user: config.proxmox_user_1, pass: config.proxmox_pass_1 });
        }
        if (config.proxmox_url_2) {
            let ip2 = config.proxmox_url_2.replace('https://', '').replace(':8006', '');
            PROXMOX_NODES.push({ name: 'Proxmox Host 2', ip: ip2, user: config.proxmox_user_2, pass: config.proxmox_pass_2 });
        }

        const SYNOLOGY_NAS = [];
        if (config.nas_ip_1) {
            SYNOLOGY_NAS.push({ name: 'NAS 1', ip: config.nas_ip_1, user: config.nas_user_1, pass: config.nas_pass_1 });
        }
        if (config.nas_ip_2) {
            SYNOLOGY_NAS.push({ name: 'NAS 2 (Backup)', ip: config.nas_ip_2, user: config.nas_user_2, pass: config.nas_pass_2 });
        }

        // Fallbacks if no config is found
        if (PROXMOX_NODES.length === 0) {
            PROXMOX_NODES.push(
                { name: 'Proxmox Host 1', ip: '192.168.1.4', user: 'root@pam', pass: 'Nevergiveup-2021' },
                { name: 'Proxmox Host 2', ip: '192.168.1.5', user: 'root@pam', pass: 'Nevergiveup-2021' }
            );
        }

        if (SYNOLOGY_NAS.length === 0) {
            // Using a generic NAS IP as fallback if not set
            SYNOLOGY_NAS.push(
                { name: 'Synology NAS', ip: '192.168.1.100', user: 'admin', pass: 'Nevergiveup-2021' }
            );
        }

        const results = { proxmox: [], synology: [] };

        // Proxmox Check
        for (const px of PROXMOX_NODES) {
            try {
                // auth
                let username = px.user;
                if (username && !username.includes('@')) {
                    username = `${username}@pam`;
                }

                const authUrl = `https://${px.ip}:8006/api2/json/access/ticket`;
                const authRes = await axios.post(authUrl, { username: username, password: px.pass }, { httpsAgent, timeout: 5000 });
                const ticket = authRes.data.data.ticket;
                const headers = { 'Cookie': `PVEAuthCookie=${ticket}` };

                // get nodes status
                const nodesRes = await axios.get(`https://${px.ip}:8006/api2/json/nodes`, { headers, httpsAgent });
                const nodesData = nodesRes.data.data;
                
                // Fetch storage and detailed status for each node
                for (let i = 0; i < nodesData.length; i++) {
                    const nodeName = nodesData[i].node;
                    try {
                        const storageRes = await axios.get(`https://${px.ip}:8006/api2/json/nodes/${nodeName}/storage`, { headers, httpsAgent });
                        nodesData[i].storage = storageRes.data.data;
                    } catch (e) {
                        nodesData[i].storage = [];
                    }

                    try {
                        const statusRes = await axios.get(`https://${px.ip}:8006/api2/json/nodes/${nodeName}/status`, { headers, httpsAgent });
                        nodesData[i].details = statusRes.data.data;
                    } catch (e) {
                        nodesData[i].details = null;
                    }
                }

                results.proxmox.push({
                    name: px.name,
                    ip: px.ip,
                    status: 'online',
                    data: nodesData
                });
            } catch (err) {
                results.proxmox.push({ name: px.name, ip: px.ip, status: 'offline', error: err.message });
            }
        }

        // Synology Check
        for (const nas of SYNOLOGY_NAS) {
            try {
                const proto = 'http';
                const port = 5000;
                const authUrl = `${proto}://${nas.ip}:${port}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(nas.user)}&passwd=${encodeURIComponent(nas.pass)}&session=Monitor&format=sid`;
                const authRes = await axios.get(authUrl, { timeout: 5000 });
                
                if (authRes.data && authRes.data.success) {
                    const sid = authRes.data.data.sid;
                    // Get Storage Info
                    const storageUrl = `${proto}://${nas.ip}:${port}/webapi/entry.cgi?api=SYNO.Storage.CGI.Storage&version=1&method=load_info&_sid=${sid}`;
                    const storageRes = await axios.get(storageUrl);

                    // Get System Info
                    const sysUrl = `${proto}://${nas.ip}:${port}/webapi/entry.cgi?api=SYNO.Core.System&version=1&method=info&_sid=${sid}`;
                    const sysRes = await axios.get(sysUrl);

                    results.synology.push({
                        name: nas.name,
                        ip: nas.ip,
                        status: 'online',
                        system: sysRes.data.data,
                        storage: storageRes.data.data
                    });
                } else {
                    results.synology.push({ name: nas.name, ip: nas.ip, status: 'auth_failed' });
                }
            } catch (err) {
                results.synology.push({ name: nas.name, ip: nas.ip, status: 'offline', error: err.message });
            }
        }

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
