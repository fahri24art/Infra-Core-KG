const express = require('express');
const router = express.Router();
const db = require('../db');

// --- Incidents ---
router.get('/incidents', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        const rows = await db('hse_incidents').orderBy('incident_date', 'desc');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/incidents', async (req, res) => {
    try {
        const payload = req.body;
        const [id] = await db('hse_incidents').insert(payload).returning('id');
        res.status(201).json({ success: true, id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/incidents/:id', async (req, res) => {
    try {
        await db('hse_incidents').where({ id: req.params.id }).update(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/incidents/:id', async (req, res) => {
    try {
        await db('hse_incidents').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Patrols ---
router.get('/patrols', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        const rows = await db('hse_patrols').orderBy('patrol_date', 'desc');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/patrols', async (req, res) => {
    try {
        const payload = req.body;
        const [id] = await db('hse_patrols').insert(payload).returning('id');
        res.status(201).json({ success: true, id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/patrols/:id', async (req, res) => {
    try {
        await db('hse_patrols').where({ id: req.params.id }).update(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/patrols/:id', async (req, res) => {
    try {
        await db('hse_patrols').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- CAPA ---
router.get('/capa', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        const rows = await db('hse_capa').orderBy('due_date', 'asc');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/capa', async (req, res) => {
    try {
        const payload = req.body;
        const [id] = await db('hse_capa').insert(payload).returning('id');
        res.status(201).json({ success: true, id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/capa/:id', async (req, res) => {
    try {
        await db('hse_capa').where({ id: req.params.id }).update(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/capa/:id', async (req, res) => {
    try {
        await db('hse_capa').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// --- HSE Statistics (Statistic Board) ---
router.get('/statistics', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        await db.raw(`
            CREATE TABLE IF NOT EXISTS hse_statistics (
                id SERIAL PRIMARY KEY,
                total_karyawan INTEGER DEFAULT 0,
                total_jam_kerja INTEGER DEFAULT 0,
                total_jam_kerja_aman INTEGER DEFAULT 0,
                total_kecelakaan_hilang_hari INTEGER DEFAULT 0,
                rekor_jam_kerja_aman INTEGER DEFAULT 0,
                first_aid INTEGER DEFAULT 0,
                medical_treatment INTEGER DEFAULT 0,
                fatality INTEGER DEFAULT 0,
                date_updated DATE DEFAULT CURRENT_DATE
            )
        `);
        
        let stats = await db('hse_statistics').first();
        if (!stats) {
            const [id] = await db('hse_statistics').insert({}).returning('id');
            stats = await db('hse_statistics').where({ id: typeof id === 'object' ? id.id : id }).first();
        }

        // --- DYNAMIC CALCULATION FROM hse_incidents ---
        const incidents = await db('hse_incidents').select('category', 'lost_work_days');
        
        let first_aid = 0;
        let medical_treatment = 0;
        let fatality = 0;
        let total_kecelakaan_hilang_hari = 0;

        for (const inc of incidents) {
            if (inc.category === 'First Aid') first_aid++;
            if (inc.category === 'Medical Treatment') medical_treatment++;
            if (inc.category === 'Fatality') fatality++;
            if (inc.category === 'LTI') {
                total_kecelakaan_hilang_hari += (Number(inc.lost_work_days) || 0);
            }
        }

        stats.first_aid = first_aid;
        stats.medical_treatment = medical_treatment;
        stats.fatality = fatality;
        stats.total_kecelakaan_hilang_hari = total_kecelakaan_hilang_hari;
        
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/statistics', async (req, res) => {
    try {
        const payload = req.body;
        // ensure only 1 row exists, we update the first one
        const stats = await db('hse_statistics').first();
        if (stats) {
            await db('hse_statistics').where({ id: stats.id }).update(payload);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Dashboard Summary ---
router.get('/dashboard/summary', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        // Zero Accident Days
        // Get the latest incident that is not 'Near Miss'
        const latestAccident = await db('hse_incidents')
            .whereNot('category', 'Near Miss')
            .orderBy('incident_date', 'desc')
            .first();

        let zeroAccidentDays = 0;
        if (latestAccident && latestAccident.incident_date) {
            const diffTime = Math.abs(new Date() - new Date(latestAccident.incident_date));
            zeroAccidentDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
            // Default 365+ if no incident found
            zeroAccidentDays = 365;
        }

        // Open CAPA count
        const capaRes = await db('hse_capa')
            .whereIn('status', ['Open', 'In Progress'])
            .count('id as total');
        const openCapaCount = Number(capaRes[0].total) || 0;

        // Incident Rate (this year)
        const currentYear = new Date().getFullYear();
        const incidentRes = await db('hse_incidents')
            .whereRaw(`EXTRACT(YEAR FROM incident_date) = ?`, [currentYear])
            .count('id as total');
        const incidentCountThisYear = Number(incidentRes[0].total) || 0;

        // Findings count (this month)
        const currentMonth = new Date().getMonth() + 1;
        const findingsRes = await db('hse_patrols')
            .whereRaw(`EXTRACT(MONTH FROM patrol_date) = ? AND EXTRACT(YEAR FROM patrol_date) = ?`, [currentMonth, currentYear])
            .count('id as total');
        const findingsThisMonth = Number(findingsRes[0].total) || 0;

        res.json({
            success: true,
            data: {
                zeroAccidentDays,
                openCapaCount,
                incidentCountThisYear,
                findingsThisMonth
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
