const fs = require('fs');
const path = require('path');

const hsePath = path.join(__dirname, 'routes', 'hse.js');
let hseContent = fs.readFileSync(hsePath, 'utf8');

const newEndpoints = `
// --- HSE Statistics (Statistic Board) ---
router.get('/statistics', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        await db.raw(\`
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
        \`);
        
        let stats = await db('hse_statistics').first();
        if (!stats) {
            const [id] = await db('hse_statistics').insert({}).returning('id');
            stats = await db('hse_statistics').where({ id: typeof id === 'object' ? id.id : id }).first();
        }
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

// --- Dashboard Summary ---`;

if (!hseContent.includes('/statistics')) {
    hseContent = hseContent.replace('// --- Dashboard Summary ---', newEndpoints);
    fs.writeFileSync(hsePath, hseContent);
    console.log('Patched hse.js with statistics endpoints');
} else {
    console.log('Already patched');
}
