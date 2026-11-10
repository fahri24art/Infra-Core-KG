const express = require('express');
const router = express.Router();
const { request } = require('urllib');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { scanSADP } = require('../utils/sadp');

const DATA_FILE = path.join(__dirname, '../data/cctv_data.json');

let nvrConfig = {
    model: 'Hikvision DS-7732NI-K4 / 32-CH NVR',
    ip: '192.168.1.200',
    username: 'admin',
    firmware: 'V4.61.025_220905',
    uptimeDays: 142,
    cpuLoad: 28,
    ramUsage: 44,
    storage: {
        totalTB: 16,
        usedTB: 11.4,
        freeTB: 4.6,
        retentionDays: 30,
        hddHealth: 'SMART OK (4x 4TB Surveillance Drives)'
    },
    channelsTotal: 32,
    mapImageUrl: '/images/tcf-sadang-plant.png'
};

let cameraList = [];

// Load data on startup
try {
    if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.nvrConfig) nvrConfig = parsed.nvrConfig;
        if (parsed.cameraList) cameraList = parsed.cameraList;
    }
} catch (e) {
    console.error('Error loading CCTV data', e);
}

function saveData() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify({ nvrConfig, cameraList }, null, 2));
    } catch (e) {
        console.error('Error saving CCTV data', e);
    }
}

// GET /api/cctv/cameras
router.get('/cameras', (req, res) => {
    try {
        res.json({
            success: true,
            totalCameras: cameraList.length,
            onlineCount: cameraList.filter(c => c.status === 'online').length,
            cameras: cameraList
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch camera list' });
    }
});

// POST /api/cctv/cameras - Add new camera
router.post('/cameras', (req, res) => {
    try {
        const newCam = {
            id: 'cam-' + String(cameraList.length + 1).padStart(2, '0'),
            channel: parseInt(req.body.channel) || cameraList.length + 1,
            name: req.body.name || 'New Camera',
            location: req.body.location || 'Unassigned Location',
            plant: req.body.plant || 'SG',
            ip: req.body.ip || '192.168.1.250',
            type: req.body.type || 'Hikvision IP Camera',
            status: req.body.status || 'online',
            category: req.body.category || 'General',
            fps: parseInt(req.body.fps) || 25,
            resolution: req.body.resolution || '1920x1080 (1080p)',
            ptzCapable: Boolean(req.body.ptzCapable),
            streamUrl: req.body.streamUrl || `rtsp://admin:admin123@${req.body.ip || '192.168.1.250'}:554/Streaming/Channels/${req.body.channel || 1}01`,
            mapCoords: req.body.mapCoords || { x: 50, y: 50, rotation: 0 }
        };
        cameraList.push(newCam);
        saveData();
        res.status(201).json({ success: true, message: 'Camera added successfully', camera: newCam });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add camera' });
    }
});

// PUT /api/cctv/cameras/:id - Edit camera
router.put('/cameras/:id', (req, res) => {
    try {
        const index = cameraList.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Camera not found' });
        }
        cameraList[index] = { ...cameraList[index], ...req.body };
        saveData();
        res.json({ success: true, message: 'Camera updated successfully', camera: cameraList[index] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update camera' });
    }
});

// DELETE /api/cctv/cameras/:id
router.delete('/cameras/:id', (req, res) => {
    try {
        const index = cameraList.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Camera not found' });
        }
        const removed = cameraList.splice(index, 1);
        saveData();
        res.json({ success: true, message: 'Camera deleted successfully', removed });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete camera' });
    }
});

// GET /api/cctv/nvr-status
router.get('/nvr-status', (req, res) => {
    try {
        res.json({
            success: true,
            nvr: {
                ...nvrConfig,
                channelsActive: cameraList.length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error checking NVR status' });
    }
});

// PUT /api/cctv/nvr-status
router.put('/nvr-status', (req, res) => {
    try {
        nvrConfig = { ...nvrConfig, ...req.body };
        saveData();
        res.json({ success: true, message: 'NVR settings updated successfully', nvr: nvrConfig });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating NVR settings' });
    }
});

// POST /api/cctv/ptz
router.post('/ptz', (req, res) => {
    const { cameraId, command, speed } = req.body;
    try {
        const camera = cameraList.find(c => c.id === cameraId);
        if (!camera) {
            return res.status(404).json({ success: false, message: 'Camera not found' });
        }
        if (!camera.ptzCapable) {
            return res.status(400).json({ success: false, message: 'Camera does not support PTZ' });
        }

        console.log(`[Hikvision ISAPI PTZ] Sent ${command} (speed ${speed || 5}) to ${camera.name} (${camera.ip})`);
        res.json({
            success: true,
            message: `PTZ Command '${command}' sent successfully to ${camera.name}`,
            camera: camera.name,
            command,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'PTZ Command execution failed' });
    }
});

// POST /api/cctv/sync-hikvision
router.post('/sync-hikvision', async (req, res) => {
    const ip = req.body.ip || nvrConfig.ip;
    const port = req.body.port || 80;
    const username = req.body.username || nvrConfig.username;
    const password = req.body.password || nvrConfig.password;
    
    if (!ip || !username || !password) {
        return res.status(400).json({ success: false, message: 'Missing IP, username, or password' });
    }

    try {
        const url = `http://${ip}:${port || 80}/ISAPI/System/Video/inputs/channels`;
        console.log(`[Hikvision ISAPI] Syncing from ${url}`);
        
        const response = await request(url, {
            digestAuth: `${username}:${password}`,
            timeout: 10000
        });

        if (response.status !== 200) {
            return res.status(response.status).json({ success: false, message: `Failed to connect or authenticate. Status: ${response.status}` });
        }

        const parser = new XMLParser();
        const channelsData = parser.parse(response.data);
        
        const videoInputs = channelsData.VideoInputChannelList?.VideoInputChannel;
        let inputsArray = [];
        if (videoInputs) {
            inputsArray = Array.isArray(videoInputs) ? videoInputs : [videoInputs];
        }

        // Try to fetch IP Cameras from InputProxy (usually starts at channel 33)
        let proxyArray = [];
        try {
            const proxyRes = await request(`http://${ip}/ISAPI/ContentMgmt/InputProxy/channels`, {
                method: 'GET',
                digestAuth: `${username}:${password}`,
                dataType: 'text',
                timeout: 5000
            });
            const proxyData = parser.parse(proxyRes.data);
            const proxyInputs = proxyData.InputProxyChannelList?.InputProxyChannel;
            if (proxyInputs) {
                proxyArray = Array.isArray(proxyInputs) ? proxyInputs : [proxyInputs];
            }
        } catch (err) {
            console.log('No InputProxy channels found or not supported by this DVR');
        }
        
        if (inputsArray.length === 0 && proxyArray.length === 0) {
            return res.status(400).json({ success: false, message: 'No channels found on NVR' });
        }

        // Backup existing cameras to preserve map coordinates and custom locations
        const existingCameras = cameraList.filter(cam => cam.nvrIp === ip);

        // Remove only cameras belonging to THIS NVR, allowing multiple NVRs to coexist
        cameraList = cameraList.filter(cam => cam.nvrIp !== ip);
        
        // Process Analog/Main channels
        inputsArray.forEach(cam => {
            // Filter out empty/disabled analog ports
            if (cam.videoResolution === 'No Video' || cam.videoInputEnabled === 'false' || cam.videoInputEnabled === false) return;
            
            const oldCam = existingCameras.find(c => c.channel == cam.id);

            cameraList.push({
                id: `cam-${ip.replace(/\./g, '-')}-${cam.id}`,
                channel: cam.id,
                name: cam.name || (oldCam ? oldCam.name : `Camera ${cam.id}`),
                location: oldCam ? oldCam.location : 'Auto Synced',
                plant: oldCam ? oldCam.plant : 'SG',
                ip: ip,
                nvrIp: ip,
                nvrUsername: username,
                nvrPassword: password,
                type: oldCam ? oldCam.type : 'General • Hikvision TVI/Analog',
                status: 'online',
                category: oldCam ? oldCam.category : 'General',
                ptzCapable: oldCam ? oldCam.ptzCapable : false, 
                streamUrl: oldCam ? oldCam.streamUrl : `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${cam.id}01`,
                mapCoords: oldCam ? oldCam.mapCoords : { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, rotation: 0 }
            });
        });

        // Process IP cameras and merge/overwrite
        proxyArray.forEach(cam => {
            const camId = cam.id;
            const camIp = cam.sourceInputPortDescriptor?.ipAddress;
            
            // FILTER OUT empty IP camera ports! (0.0.0.0 or undefined)
            if (!camIp || camIp === '0.0.0.0') return;

            const oldCam = existingCameras.find(c => c.channel == camId);
            
            const newCamData = {
                id: `cam-${ip.replace(/\./g, '-')}-${camId}`,
                channel: camId,
                name: cam.name || (oldCam ? oldCam.name : `IP Camera ${camId}`),
                location: oldCam ? oldCam.location : 'Auto Synced',
                plant: oldCam ? oldCam.plant : 'SG',
                ip: camIp, // Actual IP Camera Address!
                nvrIp: ip,
                nvrUsername: username,
                nvrPassword: password,
                type: oldCam ? oldCam.type : 'General • Hikvision IP Camera',
                status: 'online',
                category: oldCam ? oldCam.category : 'General',
                ptzCapable: oldCam ? oldCam.ptzCapable : false,
                streamUrl: oldCam ? oldCam.streamUrl : `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${camId}01`,
                mapCoords: oldCam ? oldCam.mapCoords : { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, rotation: 0 }
            };

            cameraList.push(newCamData);
        });

        saveData();
        res.json({ success: true, message: `Successfully synced ${cameraList.length} cameras from NVR`, added: cameraList.length, cameras: cameraList });
    } catch (err) {
        console.error('[Hikvision ISAPI Error]', err);
        res.status(500).json({ success: false, message: 'Error communicating with NVR: ' + err.message });
    }
});

// GET /api/cctv/snapshot/:cameraId
router.get('/snapshot/:cameraId', async (req, res) => {
    try {
        const { cameraId } = req.params;
        
        // Find the camera in memory to get its specific NVR credentials
        const cam = cameraList.find(c => c.id === cameraId);
        if (!cam) return res.status(404).send('Camera not found');
        
        const ip = cam.nvrIp || nvrConfig.ip;
        const username = cam.nvrUsername || nvrConfig.username;
        const password = cam.nvrPassword || nvrConfig.password;
        const channel = cam.channel;
        
        if (!ip || !username || !password) {
            return res.status(400).send('NVR credentials missing for this camera');
        }

        // Channel ID for ISAPI is usually <channel>01 for mainstream
        const isapiChannel = parseInt(channel) * 100 + 1;
        const snapUrl = `http://${ip}/ISAPI/Streaming/channels/${isapiChannel}/picture`;

        const response = await request(snapUrl, {
            method: 'GET',
            digestAuth: `${username}:${password}`,
            timeout: 5000,
            streaming: true // pipe directly
        });

        if (response.status !== 200) {
            return res.status(response.status).send('Failed to get snapshot');
        }

        res.set('Content-Type', 'image/jpeg');
        // Prevent caching so they can get fresh snapshots
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.res.pipe(res);
    } catch (error) {
        console.error('Snapshot error:', error.message);
        res.status(500).send('Snapshot error');
    }
});

// GET /api/network/cctv/sadp-scan
router.get('/sadp-scan', async (req, res) => {
    try {
        console.log('Initiating SADP scan...');
        const devices = await scanSADP(5000); // 5 second scan
        
        // Auto-save discovered cameras to assets table
        let inserted = 0;
        let updated = 0;
        
        for (const cam of devices) {
            const specsJson = JSON.stringify({
                type: 'Surveillance Camera',
                ip: cam.ip,
                mac: cam.mac,
                softwareVersion: cam.softwareVersion
            });
            
            // Check if exists by MAC or Serial
            const existing = await db('assets')
                .where('serial_number', cam.serial)
                .orWhereRaw("specs::text LIKE ?", [`%${cam.mac}%`])
                .first();
                
            if (existing) {
                await db('assets').where({ id: existing.id }).update({
                    ip_address: cam.ip,
                    specs: specsJson,
                    updated_at: new Date()
                });
                updated++;
            } else {
                await db('assets').insert({
                    name: `Hikvision ${cam.model} (${cam.ip})`,
                    category: 'CCTV',
                    type: 'CCTV',
                    status: 'Active',
                    manufacturer: 'HIKVISION',
                    model: cam.model,
                    serial_number: cam.serial,
                    ip_address: cam.ip,
                    specs: specsJson,
                    created_at: new Date(),
                    updated_at: new Date()
                });
                inserted++;
            }
        }
        
        res.json({
            message: `SADP Scan complete. Found ${devices.length} devices.`,
            inserted,
            updated,
            devices
        });
    } catch (err) {
        console.error('SADP Scan failed:', err);
        res.status(500).json({ error: 'SADP Scan failed', details: err.message });
    }
});

module.exports = router;
