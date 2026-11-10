const express = require('express');
const router = express.Router();
const db = require('../db');

// --- HYDRANT MASTER ---

router.get('/master', async (req, res) => {
    try {
        const hydrants = await db('hr_hydrants').orderBy('id', 'desc');
        res.json({ success: true, data: hydrants });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/master', async (req, res) => {
    try {
        const { code, location, type } = req.body;
        const [id] = await db('hr_hydrants').insert({
            code,
            location,
            type
        }).returning('id');
        res.json({ success: true, id: id?.id || id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/master/:id', async (req, res) => {
    try {
        const { code, location, type } = req.body;
        await db('hr_hydrants').where('id', req.params.id).update({
            code,
            location,
            type
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/master/:id', async (req, res) => {
    try {
        await db('hr_hydrants').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- HYDRANT CHECKSHEETS ---

router.get('/checksheets', async (req, res) => {
    try {
        const checksheets = await db('hr_hydrant_checksheets')
            .join('hr_hydrants', 'hr_hydrant_checksheets.hydrant_id', 'hr_hydrants.id')
            .select('hr_hydrant_checksheets.*', 'hr_hydrants.code as asset_code', 'hr_hydrants.location as location_name', 'hr_hydrants.type')
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

        res.json({ success: true, data: parsedChecksheets });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/checksheets', async (req, res) => {
    try {
        const { hydrant_id, check_date, inspector_name, is_box_good, is_hose_good, is_nozzle_good, is_valve_good, water_pressure, status, notes, photos } = req.body;
        const [id] = await db('hr_hydrant_checksheets').insert({
            hydrant_id,
            check_date,
            inspector_name,
            is_box_good,
            is_hose_good,
            is_nozzle_good,
            is_valve_good,
            water_pressure,
            status,
            notes,
            photos: JSON.stringify(photos || [])
        }).returning('id');
        res.json({ success: true, id: id?.id || id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/checksheets/:id', async (req, res) => {
    try {
        const checkId = req.params.id;
        const { hydrant_id, check_date, inspector_name, is_box_good, is_hose_good, is_nozzle_good, is_valve_good, water_pressure, status, notes, photos, edited_by } = req.body;
        
        await db.transaction(async trx => {
            // Get original data for logging
            const oldData = await trx('hr_hydrant_checksheets').where('id', checkId).first();
            
            // Update
            await trx('hr_hydrant_checksheets').where('id', checkId).update({
                hydrant_id,
                check_date,
                inspector_name,
                is_box_good,
                is_hose_good,
                is_nozzle_good,
                is_valve_good,
                water_pressure,
                status,
                notes,
                photos: JSON.stringify(photos || [])
            });

            // Log changes
            const changes = {};
            if (oldData.is_box_good !== is_box_good) changes.is_box_good = { old: oldData.is_box_good, new: is_box_good };
            if (oldData.is_hose_good !== is_hose_good) changes.is_hose_good = { old: oldData.is_hose_good, new: is_hose_good };
            if (oldData.is_nozzle_good !== is_nozzle_good) changes.is_nozzle_good = { old: oldData.is_nozzle_good, new: is_nozzle_good };
            if (oldData.is_valve_good !== is_valve_good) changes.is_valve_good = { old: oldData.is_valve_good, new: is_valve_good };
            if (oldData.water_pressure !== water_pressure) changes.water_pressure = { old: oldData.water_pressure, new: water_pressure };
            if (oldData.status !== status) changes.status = { old: oldData.status, new: status };
            if (oldData.notes !== notes) changes.notes = { old: oldData.notes, new: notes };

            if (Object.keys(changes).length > 0) {
                await trx('hr_hydrant_check_logs').insert({
                    check_id: checkId,
                    edited_by: edited_by || inspector_name || 'System',
                    changes: JSON.stringify(changes)
                });
            }
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/checksheets/:id/logs', async (req, res) => {
    try {
        const logs = await db('hr_hydrant_check_logs')
            .where('check_id', req.params.id)
            .orderBy('edited_at', 'desc');
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- PUBLIC ACCESS (QR CODE) ---

router.get('/public/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const hydrant = await db('hr_hydrants').where('code', code).first();
        
        if (!hydrant) {
            return res.status(404).json({ success: false, error: 'Hydrant tidak ditemukan' });
        }

        const checksheets = await db('hr_hydrant_checksheets')
            .where('hydrant_id', hydrant.id)
            .orderBy('check_date', 'desc');

        const parsedChecksheets = checksheets.map(c => {
            let parsedPhotos = [];
            try {
                parsedPhotos = typeof c.photos === 'string' ? JSON.parse(c.photos) : (c.photos || []);
            } catch (e) {}
            return { ...c, photos: parsedPhotos };
        });

        res.json({ success: true, data: { hydrant, history: parsedChecksheets } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Dashboard aggregates
router.get('/dashboard', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        
        const hydrants = await db('hr_hydrants').select('*');
        const totalHydrant = hydrants.length;
        
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        
        const checksheets = await db('hr_hydrant_checksheets')
            .where('check_date', '>=', startDate)
            .where('check_date', '<=', endDate)
            .orderBy('check_date', 'asc');
            
        let goodCount = 0;
        let badCount = 0;
        
        const matrix = hydrants.map(h => {
            const hChecks = checksheets.filter(c => c.hydrant_id === h.id);
            const months = Array(12).fill(null);
            
            hChecks.forEach(c => {
                const monthIdx = new Date(c.check_date).getMonth();
                months[monthIdx] = {
                    status: c.status === 'OK' ? 'ok' : 'bad',
                    check_date: c.check_date,
                    photos: typeof c.photos === 'string' ? JSON.parse(c.photos) : (c.photos || [])
                };
            });
            
            let latestStatus = 'Belum';
            if (hChecks.length > 0) {
                const latest = hChecks[hChecks.length - 1];
                latestStatus = latest.status;
                if (latest.status === 'OK') goodCount++;
                if (latest.status === 'RUSAK') badCount++;
            }

            return {
                ...h,
                months,
                latestStatus
            };
        });

        res.json({
            success: true,
            data: {
                totalHydrant,
                totalChecks: checksheets.length,
                goodCount,
                badCount,
                monitoringMatrix: matrix
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
