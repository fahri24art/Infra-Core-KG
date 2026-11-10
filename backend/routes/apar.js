const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

// Configure Multer for photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../public/uploads/apars');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Master APAR routes
router.get('/master', async (req, res) => {
    try {
        const apars = await db('hr_apars').orderBy('id', 'desc');
        res.json({ success: true, data: apars });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/master', upload.single('photo'), async (req, res) => {
    try {
        const payload = {
            code: req.body.code,
            location: req.body.location,
            type: req.body.type,
            weight: req.body.weight,
            expired_date: req.body.expired_date,
            created_at: new Date()
        };
        if (req.file) {
            const filePath = req.file.path;
            const tmpPath = filePath + '.tmp';
            try {
                const image = await Jimp.read(filePath);
                await image.resize(800, Jimp.AUTO)
                           .quality(80)
                           .writeAsync(tmpPath);
                fs.renameSync(tmpPath, filePath);
            } catch (err) {
                console.error("Compression failed:", err);
            }
            payload.photo_path = `/uploads/apars/${req.file.filename}`;
        }
        const [id] = await db('hr_apars').insert(payload).returning('id');
        res.status(201).json({ success: true, id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/master/:id', upload.single('photo'), async (req, res) => {
    try {
        const payload = {
            code: req.body.code,
            location: req.body.location,
            type: req.body.type,
            weight: req.body.weight,
            expired_date: req.body.expired_date,
            updated_at: new Date()
        };
        if (req.file) {
            const filePath = req.file.path;
            const tmpPath = filePath + '.tmp';
            try {
                const image = await Jimp.read(filePath);
                await image.resize(800, Jimp.AUTO)
                           .quality(80)
                           .writeAsync(tmpPath);
                fs.renameSync(tmpPath, filePath);
            } catch (err) {
                console.error("Compression failed:", err);
            }
            payload.photo_path = `/uploads/apars/${req.file.filename}`;
        }
        await db('hr_apars').where({ id: req.params.id }).update(payload);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/master/:id', async (req, res) => {
    try {
        await db('hr_apars').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Dashboard Statistics Route
router.get('/dashboard', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        
        // Fetch all APARs
        const apars = await db('hr_apars').select('*');
        const totalApar = apars.length;
        
        // Calculate expirations
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        let expiredCount = 0;
        let expiringSoonCount = 0;
        const expiredList = [];
        const expiringSoonList = [];
        
        apars.forEach(a => {
            if (!a.expired_date) return;
            const expDate = new Date(a.expired_date);
            if (expDate < now) {
                expiredCount++;
                expiredList.push(a);
            } else if (expDate <= thirtyDaysFromNow) {
                expiringSoonCount++;
                expiringSoonList.push(a);
            }
        });
        
        // Fetch checks for the year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        const checks = await db('hr_apar_checksheets')
            .where('check_date', '>=', startDate)
            .where('check_date', '<=', endDate)
            .orderBy('check_date', 'desc');
            
        const totalChecks = checks.length;
        
        // Determine Good vs Bad based on latest check for each APAR
        let goodAparCount = 0;
        let badAparCount = 0;
        
        const latestChecksMap = {};
        checks.forEach(c => {
            if (!latestChecksMap[c.apar_id]) {
                latestChecksMap[c.apar_id] = c;
            }
        });
        
        Object.values(latestChecksMap).forEach(c => {
            if (c.is_passed) goodAparCount++;
            else badAparCount++;
        });
        
        // 12-Month Matrix Construction
        const monitoringMatrix = apars.map(apar => {
            const aparChecks = checks.filter(c => c.apar_id === apar.id);
            const months = Array(12).fill(false);
            
            aparChecks.forEach(c => {
                const monthIndex = new Date(c.check_date).getMonth(); // 0-11
                let parsedPhotos = [];
                try {
                    parsedPhotos = typeof c.photos === 'string' ? JSON.parse(c.photos) : (c.photos || []);
                } catch(e) {}
                
                if (c.is_passed) {
                    months[monthIndex] = { status: 'ok', photos: parsedPhotos, check_date: c.check_date };
                } else if (!months[monthIndex] || months[monthIndex].status !== 'ok') { 
                    months[monthIndex] = { status: 'bad', photos: parsedPhotos, check_date: c.check_date };
                }
            });
            
            const latestCheck = latestChecksMap[apar.id];
            
            return {
                id: apar.id,
                code: apar.code,
                location: apar.location,
                type: apar.type,
                weight: apar.weight,
                expired_date: apar.expired_date,
                isExpired: new Date(apar.expired_date) < now,
                isExpiringSoon: new Date(apar.expired_date) >= now && new Date(apar.expired_date) <= thirtyDaysFromNow,
                months: months,
                latestStatus: latestCheck ? (latestCheck.is_passed ? 'OK' : 'RUSAK') : 'Belum'
            };
        });

        // Recent Checks (latest 10)
        const recentChecksQuery = await db('hr_apar_checksheets')
            .join('hr_apars', 'hr_apar_checksheets.apar_id', 'hr_apars.id')
            .select('hr_apar_checksheets.*', 'hr_apars.code as asset_code', 'hr_apars.location as location_name')
            .orderBy('check_date', 'desc')
            .limit(10);

        const parsedRecentChecks = recentChecksQuery.map(c => {
            let parsedPhotos = [];
            try {
                parsedPhotos = typeof c.photos === 'string' ? JSON.parse(c.photos) : (c.photos || []);
            } catch(e) {}
            return { ...c, photos: parsedPhotos };
        });

        res.json({
            success: true,
            data: {
                totalApar,
                totalChecks,
                goodAparCount,
                badAparCount,
                expiredCount,
                expiringSoonCount,
                expiredList,
                expiringSoonList,
                monitoringMatrix,
                recentChecks: parsedRecentChecks,
                year
            }
        });
    } catch (err) {
        console.error("[APAR_DASHBOARD_ERROR]", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Checksheet Routes
router.get('/public/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const apar = await db('hr_apars').where('code', code).first();
        
        if (!apar) {
            return res.status(404).json({ success: false, error: 'APAR tidak ditemukan' });
        }

        const checksheets = await db('hr_apar_checksheets')
            .where('apar_id', apar.id)
            .orderBy('check_date', 'desc');

        const parsedChecksheets = checksheets.map(c => {
            let parsedPhotos = [];
            try {
                parsedPhotos = typeof c.photos === 'string' ? JSON.parse(c.photos) : (c.photos || []);
            } catch (e) {
                console.error("Error parsing photos:", e);
            }
            return { ...c, photos: parsedPhotos };
        });

        res.json({ success: true, data: { apar, history: parsedChecksheets } });
    } catch (err) {
        console.error('Failed to fetch public APAR details:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/checksheets', async (req, res) => {
    try {
        const checksheets = await db('hr_apar_checksheets')
            .join('hr_apars', 'hr_apar_checksheets.apar_id', 'hr_apars.id')
            .select('hr_apar_checksheets.*', 'hr_apars.code as asset_code', 'hr_apars.location as location_name', 'hr_apars.type', 'hr_apars.weight')
            .orderBy('check_date', 'desc');
            
        const parsedChecksheets = checksheets.map(c => {
            let parsedPhotos = [];
            try {
                parsedPhotos = typeof c.photos === 'string' ? JSON.parse(c.photos) : (c.photos || []);
            } catch(e) {}
            return { ...c, photos: parsedPhotos };
        });

        res.json({ success: true, data: parsedChecksheets });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get specific APAR for printing card
router.get('/:id/print/:year', async (req, res) => {
    try {
        const { id, year } = req.params;
        const apar = await db('hr_apars').where({ id }).first();
        if (!apar) return res.status(404).json({ success: false, error: 'APAR not found' });
        
        // Fetch checksheets for this year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        const checks = await db('hr_apar_checksheets')
            .where('apar_id', id)
            .where('check_date', '>=', startDate)
            .where('check_date', '<=', endDate)
            .orderBy('check_date', 'asc');
        
        // Organize checksheets by month (1-12)
        const monthlyChecks = {};
        checks.forEach(c => {
            const date = new Date(c.check_date);
            const month = date.getMonth() + 1;
            monthlyChecks[month] = c;
        });

        res.json({ 
            success: true, 
            data: { 
                apar: {
                    id: apar.id,
                    code: apar.code,
                    location: apar.location || '',
                    type: apar.type || '',
                    weight: apar.weight,
                    expired_date: apar.expired_date
                },
                checksheets: monthlyChecks,
                year: parseInt(year)
            } 
        });
    } catch (error) {
        console.error('APAR print card error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/checksheets', upload.array('photos', 3), async (req, res) => {
    try {
        let photoUrls = [];
        if (req.files && req.files.length > 0) {
            for (const f of req.files) {
                const filePath = f.path;
                const tmpPath = filePath + '.tmp';
                try {
                    const image = await Jimp.read(filePath);
                    await image.resize(800, Jimp.AUTO)
                               .quality(80)
                               .writeAsync(tmpPath);
                    fs.renameSync(tmpPath, filePath);
                } catch (err) {
                    console.error("Compression failed:", err);
                }
                photoUrls.push(`/uploads/apars/${f.filename}`);
            }
        }

        // Handle stringified booleans from FormData
        const getBool = (val) => val === 'true' || val === true;

        const payload = {
            apar_id: req.body.apar_id,
            inspector_name: req.body.inspector_name || 'Admin',
            check_date: req.body.check_date,
            pin_status: getBool(req.body.pin_status),
            pin_seal_status: getBool(req.body.pin_seal_status),
            handle_status: getBool(req.body.handle_status),
            pressure_status: getBool(req.body.pressure_status),
            hose_status: getBool(req.body.hose_status),
            sticker_status: getBool(req.body.sticker_status),
            body_status: getBool(req.body.body_status),
            notes: req.body.notes || '',
            is_passed: getBool(req.body.is_passed),
            photos: JSON.stringify(photoUrls),
            created_at: new Date()
        };

        const [id] = await db('hr_apar_checksheets').insert(payload).returning('id');
        res.status(201).json({ success: true, id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/checksheets/:id', upload.array('photos', 3), async (req, res) => {
    try {
        const oldCheck = await db('hr_apar_checksheets').where({ id: req.params.id }).first();
        if (!oldCheck) return res.status(404).json({ success: false, error: 'Checksheet not found' });

        let photoUrls = [];
        try {
            photoUrls = typeof oldCheck.photos === 'string' ? JSON.parse(oldCheck.photos) : (oldCheck.photos || []);
        } catch(e) {}

        if (req.files && req.files.length > 0) {
            for (const f of req.files) {
                const filePath = f.path;
                const tmpPath = filePath + '.tmp';
                try {
                    const image = await Jimp.read(filePath);
                    await image.resize(800, Jimp.AUTO)
                               .quality(80)
                               .writeAsync(tmpPath);
                    fs.renameSync(tmpPath, filePath);
                } catch (err) {
                    console.error("Compression failed:", err);
                }
                photoUrls.push(`/uploads/apars/${f.filename}`);
            }
        }

        const getBool = (val) => val === 'true' || val === true;

        const payload = {
            inspector_name: req.body.inspector_name || oldCheck.inspector_name,
            check_date: req.body.check_date || oldCheck.check_date,
            pin_status: req.body.pin_status !== undefined ? getBool(req.body.pin_status) : oldCheck.pin_status,
            pin_seal_status: req.body.pin_seal_status !== undefined ? getBool(req.body.pin_seal_status) : oldCheck.pin_seal_status,
            handle_status: req.body.handle_status !== undefined ? getBool(req.body.handle_status) : oldCheck.handle_status,
            pressure_status: req.body.pressure_status !== undefined ? getBool(req.body.pressure_status) : oldCheck.pressure_status,
            hose_status: req.body.hose_status !== undefined ? getBool(req.body.hose_status) : oldCheck.hose_status,
            sticker_status: req.body.sticker_status !== undefined ? getBool(req.body.sticker_status) : oldCheck.sticker_status,
            body_status: req.body.body_status !== undefined ? getBool(req.body.body_status) : oldCheck.body_status,
            notes: req.body.notes !== undefined ? req.body.notes : oldCheck.notes,
            is_passed: req.body.is_passed !== undefined ? getBool(req.body.is_passed) : oldCheck.is_passed,
            photos: JSON.stringify(photoUrls),
        };

        // Determine changes
        const changes = {};
        for (const key of Object.keys(payload)) {
            if (payload[key] !== oldCheck[key] && key !== 'photos') {
                changes[key] = { old: oldCheck[key], new: payload[key] };
            }
        }
        
        // Log to hr_apar_check_logs if there are changes
        if (Object.keys(changes).length > 0) {
            await db('hr_apar_check_logs').insert({
                check_id: req.params.id,
                edited_by: req.user ? req.user.username : 'Admin',
                changes: JSON.stringify(changes)
            });
        }

        await db('hr_apar_checksheets').where({ id: req.params.id }).update(payload);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/checksheets/:id/logs', async (req, res) => {
    try {
        const logs = await db('hr_apar_check_logs')
            .where('check_id', req.params.id)
            .orderBy('edited_at', 'desc');
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
