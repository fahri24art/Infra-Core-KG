const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/hr/inventory - Fetch all HR inventory items
router.get('/inventory', async (req, res) => {
    try {
        const inventory = await db('hr_inventory').select('*').orderBy('id', 'asc');
        
        // Calculate available stock dynamically
        const processedInventory = inventory.map(item => ({
            ...item,
            available_stock: item.total_stock - item.assigned_stock,
            stock_status: (item.total_stock - item.assigned_stock) <= 0 
                    ? 'Out of Stock' 
                    : (item.total_stock - item.assigned_stock) <= 5 
                        ? 'Low Stock' 
                        : 'Sufficient',
            status: item.status_text,
            location: item.location_text
        }));

        res.json({ success: true, data: processedInventory });
    } catch (err) {
        console.error('[HR_INVENTORY_ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/hr/inventory - Add a new item
router.post('/inventory', async (req, res) => {
    try {
        const { category, item_name, total_stock, assigned_stock } = req.body;
        
        if (!category || !item_name || total_stock === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const [id] = await db('hr_inventory').insert({
            category,
            item_name,
            total_stock,
            assigned_stock: assigned_stock || 0,
            status_text: req.body.status || 'Active',
            location_text: req.body.location || 'Warehouse'
        });

        res.json({ success: true, id });
    } catch (err) {
        console.error('[HR_INVENTORY_ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Snipe-IT Style HRGA Endpoints ---

router.get('/assets', async (req, res) => {
    try {
        const assets = await db('hr_assets')
            .leftJoin('hr_models', 'hr_assets.model_id', 'hr_models.id')
            .leftJoin('hr_categories', 'hr_models.category_id', 'hr_categories.id')
            .leftJoin('users', 'hr_assets.assigned_to', 'users.id') 
            .leftJoin('hr_locations as assigned_loc', 'hr_assets.assigned_to', 'assigned_loc.id')
            .select(
                'hr_assets.*',
                'hr_models.name as model_name',
                'hr_categories.name as category_name',
                'hr_assets.location_text as location_name',
                db.raw("'' as default_location_name"),
                'hr_assets.status_text as status_name',
                db.raw("'deployable' as status_type"),
                db.raw("'#94a3b8' as status_color"),
                db.raw(`CASE WHEN hr_assets.assigned_type LIKE '%Location%' THEN assigned_loc.name ELSE users.name END as assigned_to_name`)
            );
        res.json({ success: true, data: assets });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/assets', async (req, res) => {
    try {
        const payload = {
            asset_tag: req.body.asset_tag,
            name: req.body.name || null,
            model_id: req.body.model_id || null,
            serial: req.body.serial || null,
            status_text: req.body.status || req.body.status_id || 'Deployed',
            location_text: req.body.location || req.body.location_id || 'Office',
            purchase_cost: req.body.purchase_cost || null,
            notes: req.body.notes || null,
            created_at: new Date()
        };
        const [id] = await db('hr_assets').insert(payload);
        res.status(201).json({ success: true, id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/assets/:id', async (req, res) => {
    try {
        const payload = {
            asset_tag: req.body.asset_tag,
            name: req.body.name || null,
            model_id: req.body.model_id || null,
            serial: req.body.serial || null,
            status_text: req.body.status || req.body.status_id || 'Deployed',
            location_text: req.body.location || req.body.location_id || 'Office',
            purchase_cost: req.body.purchase_cost || null,
            notes: req.body.notes || null
        };
        await db('hr_assets').where({ id: req.params.id }).update(payload);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/assets/:id', async (req, res) => {
    try {
        await db('hr_assets').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET checksheets for a specific asset
router.get('/assets/:id/checksheets', async (req, res) => {
    try {
        const rows = await db('hr_asset_checksheets')
            .where('asset_id', req.params.id)
            .orderBy('check_date', 'desc')
            .select('*');

        const parsed = rows.map(c => ({
            ...c,
            check_data: typeof c.check_data === 'string'
                ? (() => { try { return JSON.parse(c.check_data); } catch(e) { return {}; } })()
                : (c.check_data || {})
        }));

        res.json({ success: true, data: parsed });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/locations', async (req, res) => {
    try {
        const locations = await db('hr_locations').orderBy('name', 'asc');
        res.json({ success: true, data: locations });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/locations', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Name required' });
        const [id] = await db('hr_locations').insert({ name });
        res.json({ success: true, id, name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/locations/:id', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Name required' });
        await db('hr_locations').where({ id: req.params.id }).update({ name });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/locations/:id', async (req, res) => {
    try {
        await db('hr_locations').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/status-labels', async (req, res) => {
    try {
        const labels = await db('hr_status_labels').orderBy('name', 'asc');
        res.json({ success: true, data: labels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/models', async (req, res) => {
    try {
        const models = await db('hr_models')
            .join('hr_categories', 'hr_models.category_id', 'hr_categories.id')
            .select('hr_models.*', 'hr_categories.name as category_name');
        res.json({ success: true, data: models });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Unified Asset Maintenance Endpoints ---
router.get('/maintenance/checksheets', async (req, res) => {
    try {
        const { category } = req.query;
        let query = db('hr_asset_checksheets')
            .join('hr_assets', 'hr_asset_checksheets.asset_id', 'hr_assets.id')
            .leftJoin('hr_models', 'hr_assets.model_id', 'hr_models.id')
            .leftJoin('hr_categories', 'hr_models.category_id', 'hr_categories.id')
            .leftJoin('hr_locations', 'hr_assets.location_id', 'hr_locations.id')
            .select(
                'hr_asset_checksheets.*',
                db.raw('COALESCE(hr_assets.name, hr_models.name) as asset_name'),
                'hr_assets.asset_tag as asset_code',
                'hr_categories.name as category_name',
                'hr_locations.name as location_name'
            );

        if (category) {
            query = query.where('hr_asset_checksheets.category', category);
        }
        
        const checksheets = await query;
        const parsed = checksheets.map(c => ({
            ...c,
            check_data: typeof c.check_data === 'string' ? JSON.parse(c.check_data) : c.check_data
        }));
        
        res.json({ success: true, data: parsed });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/maintenance/checksheets', async (req, res) => {
    try {
        const payload = {
            ...req.body,
            check_data: typeof req.body.check_data === 'object' ? JSON.stringify(req.body.check_data) : req.body.check_data
        };
        await db('hr_asset_checksheets').insert(payload);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Dashboard Summary Endpoint ---
router.get('/dashboard/summary', async (req, res) => {
    try {
        // Total assets per category
        const assetsByCategory = await db('hr_assets')
            .leftJoin('hr_models', 'hr_assets.model_id', 'hr_models.id')
            .leftJoin('hr_categories', 'hr_models.category_id', 'hr_categories.id')
            .select('hr_categories.name as category_name')
            .count('hr_assets.id as total')
            .groupBy('hr_categories.name');

        // Assets that have been checked (have at least 1 checksheet entry)
        const checkedAssets = await db('hr_asset_checksheets')
            .join('hr_assets', 'hr_asset_checksheets.asset_id', 'hr_assets.id')
            .leftJoin('hr_models', 'hr_assets.model_id', 'hr_models.id')
            .leftJoin('hr_categories', 'hr_models.category_id', 'hr_categories.id')
            .select('hr_categories.name as category_name')
            .countDistinct('hr_asset_checksheets.asset_id as checked')
            .groupBy('hr_categories.name');

        // Build category map
        const checkedMap = {};
        checkedAssets.forEach(r => { checkedMap[r.category_name] = Number(r.checked); });

        const categoryStats = assetsByCategory.map(r => {
            const total = Number(r.total);
            const checked = checkedMap[r.category_name] || 0;
            return {
                category: r.category_name || 'Lainnya',
                total,
                checked,
                unchecked: total - checked,
                pct: total > 0 ? Math.round((checked / total) * 100) : 0
            };
        }).sort((a, b) => b.total - a.total);

        // Overall totals
        const totalAssets = categoryStats.reduce((s, c) => s + c.total, 0);
        const totalChecked = categoryStats.reduce((s, c) => s + c.checked, 0);

        res.json({
            success: true,
            data: {
                totalAssets,
                totalChecked,
                totalUnchecked: totalAssets - totalChecked,
                pctChecked: totalAssets > 0 ? Math.round((totalChecked / totalAssets) * 100) : 0,
                byCategory: categoryStats
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Employees (HRGA) Endpoints ---
router.get('/employees', async (req, res) => {
    try {
        const employees = await db('hr_employees').orderBy('name', 'asc');
        res.json({ success: true, data: employees });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/employees', async (req, res) => {
    try {
        const payload = {
            nik: req.body.nik,
            name: req.body.name,
            position: req.body.position || null,
            department: req.body.department || null,
            blood_type: req.body.blood_type || null,
            address: req.body.address || null,
            phone: req.body.phone || null,
            photo_url: req.body.photo_url || null,
            join_date: req.body.join_date || null,
            status: req.body.status || 'Active',
            created_at: new Date()
        };
        const [id] = await db('hr_employees').insert(payload).returning('id');
        res.status(201).json({ success: true, id: id?.id || id }); // Knex handles returning differently on pg vs mysql
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/employees/:id', async (req, res) => {
    try {
        const payload = {
            nik: req.body.nik,
            name: req.body.name,
            position: req.body.position,
            department: req.body.department,
            blood_type: req.body.blood_type,
            address: req.body.address,
            phone: req.body.phone,
            photo_url: req.body.photo_url,
            join_date: req.body.join_date,
            status: req.body.status,
            updated_at: new Date()
        };
        await db('hr_employees').where({ id: req.params.id }).update(payload);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/employees/:id', async (req, res) => {
    try {
        await db('hr_employees').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
